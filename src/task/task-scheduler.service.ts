import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import dayjs from '../utils/dayjs.setup';
import axios from 'axios';
import { TaskService } from './task.service';

@Injectable()
export class TaskSchedulerService {
  private readonly logger = new Logger(TaskSchedulerService.name);

  constructor(private readonly taskService: TaskService) {}

  /**
   * 매일 오전 10시에 실행되는 주간업무 보고 메일 발송 작업
   */
  @Cron(CronExpression.EVERY_DAY_AT_10AM)
  async handleWeeklyTask() {
    const today = dayjs().tz('Asia/Seoul');
    const dayOfWeek = today.day(); // 0: 일, 1: 월 ... 5: 금, 6: 토

    if (await this.checkShouldSendEmailToday()) {
      this.logger.log(`📨 ${dayjs().format('YYYY-MM-DD')} 메일 발송`);
      await this.taskService.createAndSendEmail();
    } else {
      this.logger.log(`⏸️ 오늘은 발송 안 함`);
    }
  }

  /**
   * 공휴일 여부를 확인하는 메서드
   * @param date
   * @private
   */
  private async isHoliday(date: dayjs.Dayjs): Promise<boolean> {
    const serviceKey = process.env.KOREA_HOLIDAY_API_KEY;
    const targetDate = date.format('YYYYMMDD');
    const url = `https://apis.data.go.kr/B090041/openapi/service/SpcdeInfoService/getRestDeInfo?ServiceKey=${serviceKey}&solYear=${date.year()}&solMonth=${date.format('MM')}&_type=json`;

    try {
      const res = await axios.get(url);
      const items = res.data.response.body.items.item;
      return Array.isArray(items)
        ? items.some(item => item.locdate === Number(targetDate))
        : items?.locdate === Number(targetDate);
    } catch (error) {
      this.logger.error('공휴일 API 조회 실패', error.message);
      return false;
    }
  }

  /**
   * 오늘이 메일 발송 대상인지 확인하는 메서드
   * @private
   */
  private async checkShouldSendEmailToday(): Promise<boolean> {
    const today = dayjs();
    const dayOfWeek = today.day(); // 0: 일요일 ~ 6: 토요일

    // 월~금 날짜 목록 생성 (이번 주)
    const monday = today.startOf('week').add(1, 'day'); // 월요일
    const weekdays = Array.from({ length: 5 }, (_, i) => monday.add(i, 'day'));

    // 휴일 여부 배열 [월, 화, 수, 목, 금]
    const isHolidayList = await Promise.all(
      weekdays.map((date) => this.isHoliday(date))
    );

    // 근무일 목록만 필터링 (뒤에서부터)
    for (let i = 4; i >= 0; i--) {
      const date = weekdays[i];
      if (!isHolidayList[i]) {
        // 오늘이 해당 근무일이라면 발송!
        if (today.isSame(date, 'day')) {
          return true;
        } else {
          return false;
        }
      }
    }

    return false; // 평일이 모두 공휴일이면 발송 안 함
  }
}