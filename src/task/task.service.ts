import { Injectable, Logger } from '@nestjs/common';
import { NotionService } from '../notion/notion.service';
import dayjs from '../utils/dayjs.setup';
import { NotionTaskDto } from '../dto/notion-task.dto';
import * as nodemailer from 'nodemailer';
import * as path from 'node:path';
import * as fs from 'node:fs';
import { Dayjs } from 'dayjs';
import { SheetService } from '../sheet/sheet.service';
import { MailerService } from '../mailer/mailer.service';
import { MailAttachmentDTO } from '../dto/mail-attachment.dto';

@Injectable()
export class TaskService {
  private readonly logger = new Logger(TaskService.name);
  constructor(private readonly notionService:NotionService,
              private readonly sheetService:SheetService,
              private readonly mailerService:MailerService) {
  }

  async createAndSendEmail():Promise<NotionTaskDto[]>{

    try{
      const startDate = dayjs().subtract(4, 'day').format('YYYY-MM-DD');  // 4일 전
      const endDate = dayjs().format('YYYY-MM-DD');               // 오늘
      // 다음주 월요일
      const nextMonday = dayjs().add(1, 'week').startOf('week').add(1, 'day'); // dayjs의 week는 일요일이 시작
      // 월요일부터 30일 후
      const nextFriday = nextMonday.add(30, 'day');
      const nextWeekStartDate = nextMonday.format('YYYY-MM-DD');
      const nextWeekEndDate = nextFriday.format('YYYY-MM-DD');
      const notionTaskList:NotionTaskDto[] = await this.notionService.queryDatabase(startDate, endDate, true);
      const nextWeekTaskList:NotionTaskDto[] = await this.notionService.queryDatabase(nextWeekStartDate, nextWeekEndDate, true);

      console.log("notionTaskList",notionTaskList);

      //프로젝트명 정렬
      const sortedNextWeekTaskList:NotionTaskDto[] = nextWeekTaskList.sort((a, b) =>
        a.project.localeCompare(b.project, 'ko')
      );

      // 프로젝트명 정렬
      const sortedList:NotionTaskDto[] = notionTaskList.sort((a, b) =>
        a.project.localeCompare(b.project, 'ko')
      );

      const resultList:NotionTaskDto[] = sortedList.concat(sortedNextWeekTaskList);

      if (notionTaskList.length > 0) {

        const yyyymmdd:string = dayjs().format('YYYY-MM-DD');
        const now:Dayjs = dayjs(yyyymmdd);
        const year:string = now.format('YYYY');
        const month:string = now.format('M');
        const firstDayOfMonth = now.startOf('month');
        const weekOfMonth:number = now.isoWeek() - firstDayOfMonth.isoWeek();

        //엑셀문서 업무보고서 시트 복사 후 생성
        //await this.sheetService.create(resultList);

        const html = this.generateHtml(year,month,weekOfMonth,sortedList,sortedNextWeekTaskList);
        const htmlPath = await this.writeHtmlToFile(year,month,weekOfMonth,html);
        await this.sendEmailWithAttachment(month,weekOfMonth,htmlPath);
      }
      return resultList;
    }
    catch (err){
      this.logger.error(err);
    }
    return [];
  }

  private generateHtml(year:string,month:string,week:number,taskList: NotionTaskDto[],nextWeekTaskList: NotionTaskDto[]): string {
    const rows = taskList.map(task => `
    <tr>
      <td>${task.project}</td>
      <td>${task.title}</td>
      <td>${task.description}</td>
      <td>${task.startDate ?? ''} ~ ${task.endDate ?? ''}</td>
      <td>${task.progress !== null ? `${(task.progress * 100).toFixed(0)}%` : '0%'}</td>
      <td>${task.status}</td>
      <td>${task.worklogRequired ? '🟢 필요' : '🔴 불필요'}</td>
    </tr>
  `).join('');

  const nextRows = nextWeekTaskList.map(task => `
  <tr>
    <td>${task.project}</td>
    <td>${task.title}</td>
    <td>${task.description}</td>
    <td>${task.startDate ?? ''} ~ ${task.endDate ?? ''}</td>
    <td>${task.progress !== null ? `${(task.progress * 100).toFixed(0)}%` : '0%'}</td>
    <td>${task.status}</td>
    <td>${task.worklogRequired ? '🟢 필요' : '🔴 불필요'}</td>
  </tr>
`).join('');


    return `
    <html>
      <head>
        <style>
          body {
            font-family: 'Segoe UI', sans-serif;
            background-color: #f4f4f4;
            padding: 20px;
          }
          h2 {
            color: #333;
          }
          table {
            width: 100%;
            background-color: white;
            border-collapse: collapse;
            box-shadow: 0 0 10px rgba(0,0,0,0.1);
            font-size: 14px;
          }
          th, td {
            border: 1px solid #ddd;
            padding: 12px 14px;
            text-align: center;
          }
          th {
            background-color: #7eb4f6;
            color: white;
          }
          tr:nth-child(even) {
            background-color: #f9f9f9;
          }
          tr:hover {
            background-color: #f1f1f1;
          }
        </style>
      </head>
      <body>
        <h2>📋${year}년 ${month}월 ${week}주 작업 목록 <span style="font-weight: normal;">(${taskList.length}건)</span></h2>
        <table>
          <thead>
            <tr>
              <th>프로젝트</th>
              <th>작업명</th>
              <th>설명</th>
              <th>기간</th>
              <th>진행율</th>
              <th>상태</th>
              <th>업무일지</th>
            </tr>
          </thead>
          <tbody>
            ${rows}
          </tbody>
        </table>
         <h2>📋${year}년 ${month}월 ${week + 1}주 작업 목록 <span style="font-weight: normal;">(${nextWeekTaskList.length}건)</span></h2>
        <table>
          <thead>
            <tr>
              <th>프로젝트</th>
              <th>작업명</th>
              <th>설명</th>
              <th>기간</th>
              <th>진행율</th>
              <th>상태</th>
              <th>업무일지</th>
            </tr>
          </thead>
          <tbody>
            ${nextRows}
          </tbody>
        </table>
        
      </body>
    </html>
  `;
  }

  private async sendEmailWithAttachment(month:string,week:number,htmlPath: string): Promise<void> {

    const fromX = '"FOCUS 업무 보고서" <noreply@example.com>';
    const to = 'zzsdsdsd@focusai.co.kr';
    const subject = `[작업 보고서] ${month}월 ${week}주차 업무일지 보고서`;
    const text = `📅 ${month}월 ${week}주차 작업 목록이 첨부되어 있습니다. 확인해주세요.`;
    const attachementList:MailAttachmentDTO[] = [{
      filename: `${month}월 ${week}주차 업무보고서.html`,
      path: htmlPath,
      contentType: 'text/html',
    }];

    await this.mailerService.send(fromX,to,subject,text,attachementList);

    this.logger.log('✅ 이메일 전송 완료');
  }

  private async writeHtmlToFile(year:string,month:string,week:number,html: string): Promise<string> {
    const filePath = path.join(__dirname, `../../temp/${year}년 ${month}월 ${week}주차-업무 보고서.html`);

    // 디렉토리 없으면 생성
    fs.mkdirSync(path.dirname(filePath), { recursive: true });

    fs.writeFileSync(filePath, html, 'utf-8');
    return filePath;
  }
}