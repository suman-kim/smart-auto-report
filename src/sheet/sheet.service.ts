import { Injectable, Logger } from '@nestjs/common';
import * as path from 'path';
import dayjs from '../utils/dayjs.setup';
import { Dayjs } from 'dayjs';
import axios from 'axios';
import { NotionTaskDto } from '../dto/notion-task.dto';
import * as ExcelJS from 'exceljs';
@Injectable()
export class SheetService {
  private readonly logger = new Logger(SheetService.name);
  constructor() {}

  public async create(notionTaskList: NotionTaskDto[]): Promise<string> {

    try {
      // 1. 지난 근무일 기준 템플릿 경로
      const prevWorkDay = await this.getPreviousWorkingDay();
      const formattedPrevDay = prevWorkDay.format('YYYYMMDD');
      const templatePath = path.join(__dirname, `../../excel_files/주간업무보고_Smart_Access팀_김수만_${formattedPrevDay}.xlsx`);

      const originalWorkbook = new ExcelJS.Workbook();
      await originalWorkbook.xlsx.readFile(templatePath);

      const newWorkbook = new ExcelJS.Workbook();

      // 2. 먼저 맨 앞 시트를 복제하여 첫 번째로 추가
      const firstSheet = originalWorkbook.worksheets[0];
      const clonedSheet = newWorkbook.addWorksheet(`${firstSheet.name}_복사본`);

      firstSheet.eachRow({ includeEmpty: true }, (row, rowNumber) => {
        const newRow = clonedSheet.getRow(rowNumber);
        row.eachCell({ includeEmpty: true }, (cell, colNumber) => {
          newRow.getCell(colNumber).value = cell.value;
          newRow.getCell(colNumber).style = { ...cell.style };
        });
        newRow.commit();
      });

      // 3. 기존 시트들을 순서대로 복사
      for (const sheet of originalWorkbook.worksheets) {
        const copiedSheet = newWorkbook.addWorksheet(sheet.name);
        sheet.eachRow({ includeEmpty: true }, (row, rowNumber) => {
          const newRow = copiedSheet.getRow(rowNumber);
          row.eachCell({ includeEmpty: true }, (cell, colNumber) => {
            newRow.getCell(colNumber).value = cell.value;
            newRow.getCell(colNumber).style = { ...cell.style };
          });
          newRow.commit();
        });
      }

      // 4. 저장
      const today = dayjs().format('YYYYMMDD');
      const newFileName = `주간업무보고_Smart_Access팀_김수만_${today}.xlsx`;
      const newFilePath = path.join(__dirname, '../../excel_files/', newFileName);

      await newWorkbook.xlsx.writeFile(newFilePath);
      this.logger.log(`✅ 새 엑셀 파일 생성 완료: ${newFilePath}`);

      return newFilePath;

    } catch (error) {
      this.logger.error('❌ 엑셀 파일 생성 실패', error);
      throw new Error('Excel 생성 실패');
    }
    // try {
    //   // 1. 이전 근무일로 템플릿 경로 구함
    //   const prevWorkDay = await this.getPreviousWorkingDay();
    //   const formattedPrevDay = prevWorkDay.format('YYYYMMDD');
    //   const templatePath = path.join(__dirname, `../../excel_files/주간업무보고_Smart_Access팀_김수만_${formattedPrevDay}.xlsx`);
    //
    //   const workbook = XLSX.readFile(templatePath);
    //   const sheetNames = workbook.SheetNames;
    //
    //   // 2. 기존 시트 전부 복사
    //   const newWorkbook = XLSX.utils.book_new();
    //   sheetNames.forEach(name => {
    //     const sheet = workbook.Sheets[name];
    //     XLSX.utils.book_append_sheet(newWorkbook, sheet, name);
    //   });
    //
    //   // 3. 맨 앞 시트를 복제하여 새 이름으로 앞에 붙이기
    //   const firstSheetName = sheetNames[0];
    //   const firstSheet = workbook.Sheets[firstSheetName];
    //   const duplicatedSheetName = `${firstSheetName}_복사본`;
    //   XLSX.utils.book_append_sheet(newWorkbook, firstSheet, duplicatedSheetName);
    //
    //   // 시트 순서 조정: 복사본을 가장 앞으로 이동
    //   const updatedSheetNames = [duplicatedSheetName, ...sheetNames];
    //   newWorkbook.SheetNames = updatedSheetNames;
    //
    //   // 4. 새 파일로 저장
    //   const today = dayjs().format('YYYYMMDD');
    //   const newFileName = `주간업무보고_Smart_Access팀_김수만_${today}.xlsx`;
    //   const newFilePath = path.join(__dirname, '../../excel_files/', newFileName);
    //
    //   XLSX.writeFile(newWorkbook, newFilePath);
    //   this.logger.log(`✅ 새 엑셀 파일 생성 완료: ${newFilePath}`);
    //
    //   return newFilePath;
    //
    // } catch (error) {
    //   this.logger.error('❌ 엑셀 파일 생성 실패', error);
    //   throw new Error('Excel 생성 실패');
    // }
  }

  private async getPreviousWorkingDay(): Promise<dayjs.Dayjs> {
    const today = dayjs();

    // "이번 주 월요일"의 하루 전 → 지난 주 일요일
    const lastWeekFriday = today.startOf('week').subtract(2, 'day'); // 금요일
    const lastWeekDates = Array.from({ length: 5 }, (_, i) =>
      lastWeekFriday.subtract(i, 'day') // 금 → 목 → 수 → 화 → 월
    );

    for (const date of lastWeekDates) {
      const isHoliday = await this.isHoliday(date);
      const isWeekend = date.day() === 0 || date.day() === 6; // 일 or 토
      if (!isHoliday && !isWeekend) {
        return date;
      }
    }

    throw new Error('지난 주 평일 중 근무일이 없습니다');
  }

  private async isHoliday(date: Dayjs): Promise<boolean> {
    const serviceKey = process.env.KOREA_HOLIDAY_API_KEY;
    const targetDate = date.format('YYYYMMDD');
    const url = `https://apis.data.go.kr/B090041/openapi/service/SpcdeInfoService/getRestDeInfo?ServiceKey=${serviceKey}&solYear=${date.year()}&solMonth=${date.format('MM')}&_type=json`;

    try {
      const res = await axios.get(url);
      const items = res.data.response.body.items?.item;
      return Array.isArray(items)
        ? items.some(item => item.locdate === Number(targetDate))
        : items?.locdate === Number(targetDate);
    } catch (e) {
      this.logger.warn(`공휴일 확인 실패: ${date.format('YYYY-MM-DD')}`, e.message);
      return false;
    }
  }
}
