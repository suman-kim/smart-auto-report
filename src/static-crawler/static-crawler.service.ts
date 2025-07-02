import { Injectable, Logger } from '@nestjs/common';
import puppeteer from 'puppeteer';
import * as cheerio from 'cheerio';
import axios from 'axios';

@Injectable()
export class StaticCrawlerService {
  private readonly logger = new Logger(StaticCrawlerService.name);

  async crawlAiModels(): Promise<string[]> {
    const results: string[] = [];

    try {
      // 1. Google 검색으로 최신 AI 모델 정보 수집
      const googleResults = await this.crawlGoogle();
      results.push(...googleResults);

      // 2. 주요 AI 뉴스 사이트 크롤링
      const newsResults = await this.crawlAiNewsSites();
      results.push(...newsResults);

      // 3. AI 모델 허브 사이트 크롤링
      const hubResults = await this.crawlAiHubs();
      results.push(...hubResults);

      this.logger.log(`총 ${results.length}개의 원시 데이터 수집 완료`);
      return results;
    }
    catch (error) {
      this.logger.error('크롤링 중 오류:', error);
      throw error;
    }
  }

  private async crawlGoogle(): Promise<string[]> {
    const browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    try {
      const page = await browser.newPage();
      await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36');

      const searchQueries = [
        'new AI model 2025',
        'latest AI model release',
        '최신 AI 모델 출시',
        'AI model announcement 2025'
      ];

      const results: string[] = [];

      for (const query of searchQueries) {
        await page.goto(`https://www.google.com/search?q=${encodeURIComponent(query)}&tbs=qdr:w`);
        await page.waitForSelector('#search', { timeout: 10000 });

        const searchResults = await page.evaluate(() => {
          const items = document.querySelectorAll('[data-ved] h3');
          return Array.from(items).slice(0, 10).map(item => {
            const link = item.closest('a');
            const title = item.textContent;
            const url = link?.href;
            return { title, url };
          }).filter(item => item.title && item.url);
        });

        for (const result of searchResults) {
          try {
            await page.goto(result.url, { waitUntil: 'networkidle2', timeout: 15000 });
            const content = await page.evaluate(() => document.body.innerText);
            results.push(`제목: ${result.title}\nURL: ${result.url}\n내용: ${content.slice(0, 2000)}\n---`);
          } catch (e) {
            this.logger.warn(`페이지 로드 실패: ${result.url}`);
          }
        }

        await new Promise(resolve => setTimeout(resolve, 2000)); // Rate limiting
      }

      return results;
    } finally {
      await browser.close();
    }
  }

  private async crawlAiNewsSites(): Promise<string[]> {
    const sites = [
      'https://openai.com/blog',
      'https://blog.google/technology/ai/',
      'https://www.anthropic.com/news',
      'https://huggingface.co/blog'
    ];

    const results: string[] = [];

    for (const site of sites) {
      try {
        const response = await axios.get(site, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
          },
          timeout: 15000
        });

        const $ = cheerio.load(response.data);

        // 각 사이트별 특화된 선택자 사용
        let articles: string[] = [];

        if (site.includes('openai.com')) {
          articles = this.parseOpenAIBlog($);
        } else if (site.includes('google')) {
          articles = this.parseGoogleAIBlog($);
        } else if (site.includes('anthropic')) {
          articles = this.parseAnthropicBlog($);
        } else if (site.includes('huggingface')) {
          articles = this.parseHuggingFaceBlog($);
        }

        results.push(...articles);
      } catch (error) {
        this.logger.warn(`사이트 크롤링 실패: ${site}`, error.message);
      }
    }

    return results;
  }

  private parseOpenAIBlog($: cheerio.CheerioAPI): string[] {
    const articles: string[] = [];
    $('.post-preview').slice(0, 5).each((i, elem) => {
      const title = $(elem).find('h3').text().trim();
      const link = $(elem).find('a').attr('href');
      const excerpt = $(elem).find('.post-excerpt').text().trim();

      if (title && link) {
        articles.push(`제목: ${title}\nURL: https://openai.com${link}\n요약: ${excerpt}\n---`);
      }
    });
    return articles;
  }

  private parseGoogleAIBlog($: cheerio.CheerioAPI): string[] {
    // Google AI 블로그 파싱 로직
    const articles: string[] = [];
    $('article').slice(0, 5).each((i, elem) => {
      const title = $(elem).find('h2, h3').first().text().trim();
      const link = $(elem).find('a').first().attr('href');
      const content = $(elem).text().slice(0, 500);

      if (title && content.toLowerCase().includes('model')) {
        articles.push(`제목: ${title}\nURL: ${link}\n내용: ${content}\n---`);
      }
    });
    return articles;
  }

  private parseAnthropicBlog($: cheerio.CheerioAPI): string[] {
    // Anthropic 블로그 파싱 로직
    const articles: string[] = [];
    $('.news-item, article').slice(0, 5).each((i, elem) => {
      const title = $(elem).find('h2, h3, .title').first().text().trim();
      const link = $(elem).find('a').first().attr('href');
      const content = $(elem).text().slice(0, 500);

      if (title) {
        articles.push(`제목: ${title}\nURL: ${link}\n내용: ${content}\n---`);
      }
    });
    return articles;
  }

  private parseHuggingFaceBlog($: cheerio.CheerioAPI): string[] {
    // HuggingFace 블로그 파싱 로직
    const articles: string[] = [];
    $('.blog-card, article').slice(0, 5).each((i, elem) => {
      const title = $(elem).find('h2, h3, .title').first().text().trim();
      const link = $(elem).find('a').first().attr('href');
      const content = $(elem).text().slice(0, 500);

      if (title) {
        const fullUrl = link?.startsWith('http') ? link : `https://huggingface.co${link}`;
        articles.push(`제목: ${title}\nURL: ${fullUrl}\n내용: ${content}\n---`);
      }
    });
    return articles;
  }

  private async crawlAiHubs(): Promise<string[]> {
    const results: string[] = [];

    try {
      // Papers with Code 최신 모델 정보
      const papersResponse = await axios.get('https://paperswithcode.com/methods/category/language-models');
      const $ = cheerio.load(papersResponse.data);

      $('.paper-card').slice(0, 10).each((i, elem) => {
        const title = $(elem).find('.paper-title').text().trim();
        const link = $(elem).find('a').attr('href');
        const description = $(elem).find('.paper-abstract').text().trim();

        if (title && link) {
          results.push(`제목: ${title}\nURL: https://paperswithcode.com${link}\n설명: ${description}\n---`);
        }
      });
    } catch (error) {
      this.logger.warn('Papers with Code 크롤링 실패:', error.message);
    }

    return results;
  }
}