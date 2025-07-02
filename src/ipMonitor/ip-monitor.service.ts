import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import * as os from 'os';
import * as fs from 'fs';
import * as path from 'path';
import axios from 'axios';
import { MailerService } from '../mailer/mailer.service';

@Injectable()
export class IpMonitorService implements OnModuleInit {
  private readonly logger = new Logger(IpMonitorService.name);
  private readonly ipFilePath = path.join(__dirname, '../../current-ip.txt');

  constructor(private readonly emailService: MailerService) {}

  async onModuleInit() {
    await this.monitorIp(); // 최초 1회 실행
  }

  // 30분마다 체크
  @Cron(CronExpression.EVERY_30_MINUTES)
  async handleCron() {
    await this.monitorIp(); // 주기적 실행
  }

  async monitorIp() {
    try {
      const savedIp = this.readSavedIp();

      // 1차: 네트워크 인터페이스에서 IP 확인 (모뎀 직연결 시 공인 IP 포함)
      let currentIp = this.getCurrentNetworkIp();

      // 2차: 외부 서비스로 공인 IP 확인 (백업용)
      if (!currentIp) {
        currentIp = await this.getPublicIp();
      }

      if (currentIp && currentIp !== savedIp) {
        this.logger.log(`🔄 IP 변경 감지됨: ${savedIp} → ${currentIp}`);

        const ipType = this.getIpType(currentIp);
        const fromX = "IP 주소 변경 감지";
        const subject = `🌐 ${ipType} IP 주소 변경: ${currentIp}`;
        const text = `
                      IP 주소가 변경되었습니다.
                      
                      이전 IP: ${savedIp || '없음'}
                      현재 IP: ${currentIp}
                      IP 유형: ${ipType}
                      
                      변경 시간: ${new Date().toLocaleString('ko-KR')}
                      
                      ${ipType === '공인' ?
                                '⚠️ 공인 IP 변경은 인터넷 연결 환경의 변화를 의미합니다.' :
                                '네트워크 설정을 확인하시거나 필요한 설정을 업데이트해주세요.'
                              }
                      
                      감지 방법: ${this.isInternalIp(currentIp) ? '네트워크 인터페이스' : '외부 IP 조회 서비스'}
        `;

        try {
          await this.emailService.send(fromX, subject, text);
          this.logger.log('📧 IP 변경 알림 이메일 발송 완료');
        } catch (mailErr) {
          this.logger.error('📨 이메일 전송 실패', mailErr);
        }

        this.saveCurrentIp(currentIp);
      } else if (!currentIp) {
        this.logger.warn('⚠️ IP 주소를 감지할 수 없음');

        const fromX = "⚠️ IP 주소 감지 실패";
        const subject = `IP 주소를 감지할 수 없음`;
        const text = `
                      IP 주소를 감지할 수 없습니다.
                      
                      네트워크 연결 상태를 확인해주세요:
                      - 모뎀/라우터 연결 상태 확인
                      - 네트워크 어댑터 상태 점검
                      - 인터넷 연결 상태 확인
                      
                      시간: ${new Date().toLocaleString('ko-KR')}
        `;

        try {
          await this.emailService.send(fromX, subject, text);
        } catch (mailErr) {
          this.logger.error('📨 이메일 전송 실패', mailErr);
        }
      } else {
        this.logger.log(`✅ IP 변경 없음: ${currentIp} (${this.getIpType(currentIp)})`);
      }
    } catch (error) {
      this.logger.error('❌ IP 확인 실패', error);

      const fromX = "❌ IP 모니터링 오류";
      const subject = `IP 모니터링 시스템 오류 발생`;
      const text = `
                    IP 모니터링 중 오류가 발생했습니다.
                    
                    오류 메시지: ${error.message}
                    시간: ${new Date().toLocaleString('ko-KR')}
                    
                    시스템 상태를 점검해주세요.
      `;

      try {
        await this.emailService.send(fromX, subject, text);
      } catch (mailErr) {
        this.logger.error('📨 오류 알림 이메일 전송 실패', mailErr);
      }
    }
  }

  /**
   * 네트워크 인터페이스에서 IP 주소를 가져옵니다 (사설 IP + 공인 IP 모두)
   * @returns IP 주소 또는 null
   */
  private getCurrentNetworkIp(): string | null {
    try {
      const networkInterfaces = os.networkInterfaces();

      // 우선순위: 공인 IP > 사설 IP
      let publicIp: string | null = null;
      let privateIp: string | null = null;

      for (const interfaceName of Object.keys(networkInterfaces)) {
        const interfaces = networkInterfaces[interfaceName];

        if (!interfaces) continue;

        for (const iface of interfaces) {
          // IPv4이고, 내부 주소가 아니며, 로컬호스트가 아닌 경우
          if (iface.family === 'IPv4' && !iface.internal) {
            const ip = iface.address;

            if (this.isInternalIp(ip)) {
              // 사설 IP
              if (!privateIp) {
                privateIp = ip;
                this.logger.log(`📍 감지된 사설 IP: ${ip} (인터페이스: ${interfaceName})`);
              }
            } else {
              // 공인 IP (모뎀 직연결 시)
              publicIp = ip;
              this.logger.log(`🌐 감지된 공인 IP: ${ip} (인터페이스: ${interfaceName})`);
            }
          }
        }
      }

      // 공인 IP 우선 반환, 없으면 사설 IP 반환
      return publicIp || privateIp;
    } catch (error) {
      this.logger.error('네트워크 인터페이스 IP 조회 중 오류:', error);
      return null;
    }
  }

  /**
   * 외부 서비스를 통해 공인 IP 주소를 조회합니다
   * @returns 공인 IP 주소 또는 null
   */
  private async getPublicIp(): Promise<string | null> {
    const services = [
      'https://ifconfig.me/ip',
      'https://api.ipify.org',
      'https://icanhazip.com',
      'https://checkip.amazonaws.com'
    ];

    for (const service of services) {
      try {
        this.logger.log(`🔍 외부 IP 조회 시도: ${service}`);

        const response = await axios.get(service, {
          timeout: 10000,
          headers: {
            'User-Agent': 'IP-Monitor-Service/1.0'
          }
        });

        const ip = response.data.trim();

        // IP 형식 유효성 검사
        if (this.isValidIp(ip)) {
          this.logger.log(`🌐 외부 서비스에서 공인 IP 확인: ${ip}`);
          return ip;
        }
      } catch (error) {
        this.logger.warn(`외부 IP 조회 실패 (${service}):`, error.message);
      }
    }

    this.logger.error('모든 외부 IP 조회 서비스 실패');
    return null;
  }

  /**
   * IP 주소 유효성 검사
   */
  private isValidIp(ip: string): boolean {
    const ipRegex = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
    return ipRegex.test(ip);
  }

  /**
   * IP 주소 유형을 반환합니다
   */
  private getIpType(ip: string): string {
    if (this.isInternalIp(ip)) {
      return '사설';
    } else {
      return '공인';
    }
  }

  /**
   * IP 주소가 내부 네트워크 대역인지 확인
   * @param ip IP 주소
   * @returns 내부 IP 여부
   */
  private isInternalIp(ip: string): boolean {
    if (!this.isValidIp(ip)) return false;

    const parts = ip.split('.').map(Number);
    const [a, b] = parts;

    // RFC 1918 사설 IP 대역
    // 10.x.x.x
    if (a === 10) return true;

    // 172.16.x.x - 172.31.x.x
    if (a === 172 && b >= 16 && b <= 31) return true;

    // 192.168.x.x
    if (a === 192 && b === 168) return true;

    // 127.x.x.x (로컬호스트)
    if (a === 127) return true;

    return false;
  }

  /**
   * 저장된 IP 주소를 읽어옵니다
   */
  private readSavedIp(): string {
    try {
      return fs.existsSync(this.ipFilePath)
        ? fs.readFileSync(this.ipFilePath, 'utf-8').trim()
        : '';
    } catch (error) {
      this.logger.warn('저장된 IP 읽기 실패:', error);
      return '';
    }
  }

  /**
   * 현재 IP 주소를 파일에 저장합니다
   */
  private saveCurrentIp(ip: string) {
    try {
      fs.writeFileSync(this.ipFilePath, ip, 'utf-8');
      this.logger.log(`💾 현재 IP 저장됨: ${ip}`);
    } catch (error) {
      this.logger.error('IP 저장 실패:', error);
    }
  }

  /**
   * 현재 IP 상태를 수동으로 확인 (API 엔드포인트용)
   */
  async getCurrentStatus() {
    const networkIp = this.getCurrentNetworkIp();
    const publicIp = await this.getPublicIp();
    const savedIp = this.readSavedIp();

    // 우선순위: 네트워크 인터페이스에서 감지된 IP > 외부 서비스 IP
    const currentIp = networkIp || publicIp;

    return {
      currentIp,
      networkIp, // 네트워크 인터페이스에서 감지된 IP
      publicIp,  // 외부 서비스에서 조회한 IP
      savedIp,
      ipType: currentIp ? this.getIpType(currentIp) : 'unknown',
      isChanged: currentIp !== savedIp,
      lastChecked: new Date().toISOString(),
      networkInterfaces: this.getNetworkInterfacesSummary()
    };
  }

  /**
   * 네트워크 인터페이스 요약 정보
   */
  private getNetworkInterfacesSummary() {
    const networkInterfaces = os.networkInterfaces();
    const summary: any = {};

    for (const [name, interfaces] of Object.entries(networkInterfaces)) {
      if (!interfaces) continue;

      summary[name] = interfaces
        .filter(iface => iface.family === 'IPv4')
        .map(iface => ({
          address: iface.address,
          internal: iface.internal,
          isPrivate: this.isInternalIp(iface.address),
          type: iface.internal ? 'loopback' : this.isInternalIp(iface.address) ? 'private' : 'public'
        }));
    }

    return summary;
  }

  /**
   * 강제로 IP 체크 실행 (수동 트리거용)
   */
  async forceCheck() {
    this.logger.log('🔍 수동 IP 체크 실행');
    await this.monitorIp();
  }
}


// 사용 예시 및 테스트
/*
🔍 API 엔드포인트:

1. IP 상태 확인:
   GET http://localhost:3000/ip-monitor/status

   응답 예시:
   {
     "message": "IP 모니터링 상태 조회 완료",
     "currentIp": "192.168.1.100",
     "savedIp": "192.168.1.99",
     "isChanged": true,
     "lastChecked": "2025-07-02T08:30:00.000Z",
     "networkInterfaces": {
       "Wi-Fi": [
         {
           "address": "192.168.1.100",
           "internal": false,
           "isPrivate": true
         }
       ]
     }
   }

2. 강제 IP 체크:
   POST http://localhost:3000/ip-monitor/check

3. 네트워크 정보 조회:
   GET http://localhost:3000/ip-monitor/network-info

📧 이메일 알림 예시:

제목: 🌐 내부 IP 주소 변경: 192.168.1.100
내용:
내부 IP 주소가 변경되었습니다.

이전 IP: 192.168.1.99
현재 IP: 192.168.1.100

변경 시간: 2025. 7. 2. 오후 5:30:00

네트워크 설정을 확인하시거나 필요한 설정을 업데이트해주세요.

⏰ 모니터링 주기: 30분마다 자동 체크
📁 IP 저장 위치: current-ip.txt
🔍 감지 대상: RFC 1918 사설 IP 대역
   - 10.0.0.0/8 (10.0.0.0 - 10.255.255.255)
   - 172.16.0.0/12 (172.16.0.0 - 172.31.255.255)
   - 192.168.0.0/16 (192.168.0.0 - 192.168.255.255)
*/