import { Page, chromium } from "playwright";
import {
  connectToMongoDB,
  disconnectFromMongoDB,
} from "./mongoDbConnection.js";
import { ObjectId } from "mongodb";

const database = "website_seo";

async function UpdateRankValue() {
  try {
    const result = await connectToMongoDB();
    const collection = await result.db("test").collection(database);
    let response = await collection.find({}).toArray();

    for (let i = 0; i < response.length; i++) {
      if (response[i].keywords.length > 0) {
        const resultedKeywordsArray = await GoogleAndBingRankFinder(
          response[i].url,
          response[i].keywords
        );
        // console.log(resultedKeywordsArray)
        const id = response[i]._id.toString();
        await collection.updateOne(
          { _id:new ObjectId(id) },
          { $set: { keywords: resultedKeywordsArray } }
        );
      }
    }
  } catch (error) {
    console.log("this is the error:", error);
  } finally {
    disconnectFromMongoDB();
  }
}

UpdateRankValue();

async function GoogleAndBingRankFinder(website: string, keywords: []) {
  const browser = await chromium.launch({ headless: false });

  const updatedKeywordsArrayBingRank = await Promise.all(
    keywords.map(async (item: any) => {
      const context = await browser.newContext();
      const page = await context.newPage();
      await page.goto(`https://www.bing.com/search?q=${item.title}`);
      let links: (string | null)[] = [];
      const extractLinks = () => {
        const anchorTags = document.querySelectorAll('a[class="tilk"]');
        return Array.from(anchorTags, (anchor) => anchor.getAttribute("href"));
      };
      const newLinks = await page.evaluate(extractLinks);
      links.push(...newLinks);

      let pageCount = 1;
      while (pageCount < 10) {
        await page.goto(
          `https://www.bing.com/search?q=${item.title}&first=${pageCount}1`
        );
        const newLinks = await page.evaluate(extractLinks);
        links.push(...newLinks);
        await page.waitForTimeout(2000);
        pageCount++;
      }

      // console.log("These are the links:", links, links.length);
      const dynamicPattern = new RegExp(website.slice(8));

      const index = links.findIndex((url, _index) => {
        if (url && url.match(dynamicPattern)) {
          return true;
        }
        return false;
      });
      await page.close();
      return {
        ...item,
        bingRank: index > 0 ? Number(index) + 1 : 0,
      };
    })
  );

  // google rank
  const updatedKeywordsArrayGoogleRank = await Promise.all(
    updatedKeywordsArrayBingRank.map(async (item: any) => {
      const context = await browser.newContext();
      const page = await context.newPage();
      await page.goto(`https://www.google.com/search?q=${item.title}`);

      let links: (string | null)[] = [];

      const extractLinks = () => {
        const anchorTags = document.querySelectorAll('a[jsname="UWckNb"]');
        return Array.from(anchorTags, (anchor) => anchor.getAttribute("href"));
      };

      let pageCount = 0;
      while (pageCount < 5) {
        const newLinks = await page.evaluate(extractLinks);
        links = [...newLinks];

        await page.evaluate(() => {
          window.scrollTo(0, document.body.scrollHeight);
        });
        const moreResultsButton = await page.$("span.RVQdVd");
        const buttonText = moreResultsButton
          ? await moreResultsButton.innerText()
          : "";

        if (moreResultsButton && buttonText.trim() === "More results") {
          await moreResultsButton.click();
          await page.waitForTimeout(4000);
        }
        await page.waitForTimeout(2000);
        pageCount++;
      }

      const dynamicPattern = new RegExp(website.slice(8));

      const index = links.findIndex((url, _index) => {
        if (url && url.match(dynamicPattern)) {
          return true;
        }
        return false;
      });
      await page.close();

      return {
        ...item,
        googleRank: index > 0 ? Number(index) + 1 : 0,
      };
    })
  );

  await browser.close();
  return updatedKeywordsArrayGoogleRank;
}