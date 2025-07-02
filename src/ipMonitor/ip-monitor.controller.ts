import { Controller, Get, Post } from '@nestjs/common';
import { IpMonitorService } from './ip-monitor.service';

@Controller('ip-monitor')
export class IpMonitorController {
  constructor(private readonly ipMonitorService: IpMonitorService) {}

  @Get('status')
  async getStatus() {
    const status = await this.ipMonitorService.getCurrentStatus();
    return {
      message: 'IP 모니터링 상태 조회 완료',
      ...status
    };
  }

  @Post('check')
  async forceCheck() {
    await this.ipMonitorService.forceCheck();
    return {
      message: 'IP 체크를 수동으로 실행했습니다',
      timestamp: new Date().toISOString()
    };
  }

  @Get('network-info')
  async getNetworkInfo() {
    const status = await this.ipMonitorService.getCurrentStatus();
    return {
      message: '네트워크 인터페이스 정보',
      networkInterfaces: status.networkInterfaces,
      currentIp: status.currentIp
    };
  }
}
