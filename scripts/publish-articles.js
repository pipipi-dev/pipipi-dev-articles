const fs = require('fs');
const path = require('path');
const axios = require('axios');
const matter = require('gray-matter');

// 記事データを保存するためのJSONファイル
const ARTICLE_DATA_FILE = path.join(process.cwd(), 'config', 'published-articles.json');

// 公開済み記事データの読み込み
function loadPublishedData() {
  if (fs.existsSync(ARTICLE_DATA_FILE)) {
    return JSON.parse(fs.readFileSync(ARTICLE_DATA_FILE, 'utf8'));
  }
  return {};
}

// 公開済み記事データの保存
function savePublishedData(data) {
  const configDir = path.dirname(ARTICLE_DATA_FILE);
  if (!fs.existsSync(configDir)) {
    fs.mkdirSync(configDir, { recursive: true });
  }
  fs.writeFileSync(ARTICLE_DATA_FILE, JSON.stringify(data, null, 2));
}

// Qiitaに投稿
async function publishToQiita(article, publishedData) {
  if (!process.env.QIITA_API_TOKEN) {
    console.log('⚠️  QIITA_API_TOKEN not found, skipping Qiita publishing');
    return null;
  }

  const qiitaPath = path.join(process.cwd(), 'qiita', 'public', `${article.slug}.md`);
  if (!fs.existsSync(qiitaPath)) {
    console.log(`⏭️  Qiitaファイルが存在しません: ${qiitaPath}`);
    return null;
  }

  const qiitaContent = fs.readFileSync(qiitaPath, 'utf8');
  const parsed = matter(qiitaContent);
  
  try {
    const existingId = publishedData[article.slug]?.qiita_id;
    
    if (existingId) {
      // 既存記事を更新
      console.log(`🔄 Qiita記事更新中: ${article.slug}`);
      const response = await axios.patch(
        `https://qiita.com/api/v2/items/${existingId}`,
        {
          title: parsed.data.title,
          body: parsed.content,
          tags: parsed.data.tags,
          private: parsed.data.private || false
        },
        {
          headers: {
            'Authorization': `Bearer ${process.env.QIITA_API_TOKEN}`,
            'Content-Type': 'application/json'
          }
        }
      );
      
      console.log(`✅ Qiita記事更新成功: ${response.data.url}`);
      return { id: response.data.id, url: response.data.url };
      
    } else {
      // 新規記事作成
      console.log(`📝 Qiita新規記事投稿中: ${article.slug}`);
      const response = await axios.post(
        'https://qiita.com/api/v2/items',
        {
          title: parsed.data.title,
          body: parsed.content,
          tags: parsed.data.tags,
          private: parsed.data.private || false
        },
        {
          headers: {
            'Authorization': `Bearer ${process.env.QIITA_API_TOKEN}`,
            'Content-Type': 'application/json'
          }
        }
      );
      
      console.log(`✅ Qiita記事投稿成功: ${response.data.url}`);
      return { id: response.data.id, url: response.data.url };
    }
    
  } catch (error) {
    console.error(`❌ Qiita投稿エラー (${article.slug}):`, error.response?.data || error.message);
    return null;
  }
}

// Dev.toに投稿
async function publishToDevTo(article, publishedData) {
  if (!process.env.DEV_TO_API_KEY) {
    console.log('⚠️  DEV_TO_API_KEY not found, skipping Dev.to publishing');
    return null;
  }

  const devtoPath = path.join(process.cwd(), 'dev-to', `${article.slug}.md`);
  if (!fs.existsSync(devtoPath)) {
    console.log(`⏭️  Dev.toファイルが存在しません: ${devtoPath}`);
    return null;
  }

  const devtoContent = fs.readFileSync(devtoPath, 'utf8');
  const parsed = matter(devtoContent);
  
  try {
    const existingId = publishedData[article.slug]?.devto_id;
    
    if (existingId) {
      // 既存記事を更新
      console.log(`🔄 Dev.to記事更新中: ${article.slug}`);
      const response = await axios.put(
        `https://dev.to/api/articles/${existingId}`,
        {
          article: {
            title: parsed.data.title,
            body_markdown: parsed.content,
            published: parsed.data.published || true,
            tags: parsed.data.tags ? parsed.data.tags.split(', ') : [],
            description: parsed.data.description
          }
        },
        {
          headers: {
            'api-key': process.env.DEV_TO_API_KEY,
            'Content-Type': 'application/json'
          }
        }
      );
      
      console.log(`✅ Dev.to記事更新成功: ${response.data.url}`);
      return { id: response.data.id, url: response.data.url };
      
    } else {
      // 新規記事作成
      console.log(`📝 Dev.to新規記事投稿中: ${article.slug}`);
      const response = await axios.post(
        'https://dev.to/api/articles',
        {
          article: {
            title: parsed.data.title,
            body_markdown: parsed.content,
            published: parsed.data.published || true,
            tags: parsed.data.tags ? parsed.data.tags.split(', ') : [],
            description: parsed.data.description
          }
        },
        {
          headers: {
            'api-key': process.env.DEV_TO_API_KEY,
            'Content-Type': 'application/json'
          }
        }
      );
      
      console.log(`✅ Dev.to記事投稿成功: ${response.data.url}`);
      return { id: response.data.id, url: response.data.url };
    }
    
  } catch (error) {
    console.error(`❌ Dev.to投稿エラー (${article.slug}):`, error.response?.data || error.message);
    return null;
  }
}

// 公開記事の取得
function getPublishedArticles() {
  const articlesDir = path.join(process.cwd(), 'articles');
  const files = fs.readdirSync(articlesDir).filter(file => file.endsWith('.md'));
  
  return files.map(file => {
    const filePath = path.join(articlesDir, file);
    const content = fs.readFileSync(filePath, 'utf8');
    const parsed = matter(content);
    
    return {
      filename: file,
      slug: file.replace('.md', ''),
      frontmatter: parsed.data,
      content: parsed.content
    };
  }).filter(article => article.frontmatter.published);
}

// メイン実行
async function main() {
  console.log('🚀 記事投稿を開始...');
  
  const articles = getPublishedArticles();
  const publishedData = loadPublishedData();
  
  console.log(`📝 ${articles.length}件の公開記事を検出`);
  
  for (const article of articles) {
    console.log(`\n📄 処理中: ${article.filename}`);
    
    // プラットフォーム選択の確認
    const platforms = article.frontmatter.platforms || ['zenn', 'qiita', 'devto'];
    console.log(`🎯 対象プラットフォーム: ${platforms.join(', ')}`);
    
    if (!publishedData[article.slug]) {
      publishedData[article.slug] = {};
    }
    
    // Qiita投稿
    if (platforms.includes('qiita')) {
      const qiitaResult = await publishToQiita(article, publishedData);
      if (qiitaResult) {
        publishedData[article.slug].qiita_id = qiitaResult.id;
        publishedData[article.slug].qiita_url = qiitaResult.url;
      }
    } else {
      console.log('⏭️  Qiita投稿スキップ（プラットフォーム指定外）');
    }
    
    // Dev.to投稿
    if (platforms.includes('devto')) {
      const devtoResult = await publishToDevTo(article, publishedData);
      if (devtoResult) {
        publishedData[article.slug].devto_id = devtoResult.id;
        publishedData[article.slug].devto_url = devtoResult.url;
      }
    } else {
      console.log('⏭️  Dev.to投稿スキップ（プラットフォーム指定外）');
    }
    
    // Zenn（GitHub連携のため、投稿処理は不要）
    if (platforms.includes('zenn')) {
      console.log('✅ Zenn: GitHub連携により自動投稿されます');
    }
    
    // レート制限対策：記事間で少し待機
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  
  // 投稿データを保存
  savePublishedData(publishedData);
  
  console.log('\n🎉 投稿処理完了!');
  console.log('📊 結果はconfig/published-articles.jsonに保存されました');
}

if (require.main === module) {
  main().catch(error => {
    console.error('❌ 投稿処理でエラーが発生:', error);
    process.exit(1);
  });
}

module.exports = {
  publishToQiita,
  publishToDevTo,
  getPublishedArticles
};