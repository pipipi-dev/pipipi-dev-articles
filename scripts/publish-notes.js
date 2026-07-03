/**
 * note/ 配下のエッセイを Memoreru へ投稿する (このリポ固有のスクリプト)
 *
 * note.com には API が無いため投稿は手動。その原稿 (frontmatter 無し・H1 がタイトル) を
 * Memoreru へも公開するための、pipipi-dev-articles 固有の運用スクリプト。
 * multi-platform-publisher (upstream テンプレート) には含めない。
 *
 * 環境変数は publish-memoreru.js と共通 (MEMORERU_API_TOKEN / MEMORERU_DRY_RUN)。
 */
const fs = require('fs');
const path = require('path');
const { upsertPage, buildPagePayload } = require('./publish-memoreru');
const { loadPublishedData, savePublishedData } = require('./publish-articles');

async function main() {
  const noteDir = path.join(process.cwd(), 'note');
  if (!fs.existsSync(noteDir)) return;
  if (!process.env.MEMORERU_API_TOKEN && process.env.MEMORERU_DRY_RUN !== '1') {
    console.log('⏭️  MEMORERU_API_TOKEN が設定されていないため、note の Memoreru 投稿をスキップします');
    return;
  }

  const publishedData = loadPublishedData();
  const files = fs.readdirSync(noteDir).filter(f => f.endsWith('.md')).sort();
  console.log(`📝 note: ${files.length}件の原稿を検出`);

  for (const file of files) {
    const slug = file.replace('.md', '');
    const raw = fs.readFileSync(path.join(noteDir, file), 'utf8').replace(/\r\n/g, '\n');
    const h1 = raw.match(/^#\s+(.+)$/m);
    if (!h1) {
      console.log(`⏭️  note/${file}: H1 が無いためスキップ`);
      continue;
    }
    console.log(`\n📄 処理中 (note): ${file}`);
    if (!publishedData[slug]) publishedData[slug] = {};
    const result = await upsertPage(slug, buildPagePayload({ title: h1[1].trim(), body: raw }), publishedData);
    if (result) {
      publishedData[slug].memoreru_id = result.id;
      publishedData[slug].memoreru_url = result.url;
    }
    await new Promise(resolve => setTimeout(resolve, 500));
  }

  // 投稿実績の無い空エントリは残さない
  for (const slug of Object.keys(publishedData)) {
    if (Object.keys(publishedData[slug]).length === 0) delete publishedData[slug];
  }
  savePublishedData(publishedData);
  console.log('\n🎉 note の投稿処理完了!');
}

if (require.main === module) {
  main().catch(error => {
    console.error('❌ エラー:', error.message);
    process.exit(1);
  });
}
