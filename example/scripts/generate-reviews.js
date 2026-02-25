const fs = require('fs').promises;
const path = require('path');
const { randomUUID } = require('crypto');

// Configuration
const DOCS_DIR = path.join(__dirname, '../docs');
const REVIEWS_DIR = path.join(__dirname, '../reviews');
const AUTHORS = ['Alice', 'Bob', 'Charlie', 'Diana', 'Eve', 'Frank'];
const COMMENT_TYPES = ['question', 'suggestion', 'issue'];
const STATUSES = ['open', 'resolved'];

// Comment templates
const TEMPLATES = {
  question: [
    'Could you clarify what {topic} means?',
    'What is the difference between {topic} and {alternative}?',
    'Can you provide an example of {topic}?',
    'Is {topic} required or optional?',
    'How does {topic} work with {other}?',
  ],
  suggestion: [
    'Consider adding a diagram to visualize {topic}.',
    'This section could benefit from more examples.',
    'You might want to link to {related} here.',
    'Consider breaking this into smaller sections.',
    'Adding a code snippet would help explain {topic}.',
  ],
  issue: [
    'There appears to be a typo in this section.',
    'This code snippet is missing {element}.',
    'The command shown here doesn\'t work as written.',
    'This contradicts what was said in {other}.',
    'The link to {target} appears to be broken.',
  ],
};

// Parse command line arguments
const args = process.argv.slice(2);
const clean = args.includes('--clean');
const countArg = args.find(arg => arg.startsWith('--count='));
const commentsPerDoc = countArg ? parseInt(countArg.split('=')[1]) : null;

// Random helpers
function randomItem(array) {
  return array[Math.floor(Math.random() * array.length)];
}

function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomDate(daysAgo = 30) {
  const date = new Date();
  date.setDate(date.getDate() - randomInt(7, daysAgo));
  date.setHours(randomInt(0, 23), randomInt(0, 59), 0, 0);
  return date.toISOString();
}

// Generate comment content
function generateContent(type) {
  const template = randomItem(TEMPLATES[type]);
  return template
    .replace('{topic}', 'this feature')
    .replace('{alternative}', 'the other approach')
    .replace('{other}', 'the previous section')
    .replace('{related}', 'the related documentation')
    .replace('{element}', 'a closing bracket')
    .replace('{target}', 'the API reference');
}

// Generate anchor
function generateAnchor() {
  const scope = randomItem(['document', 'text', 'text', 'text', 'text', 'block', 'block']);

  if (scope === 'document') {
    return {
      scope: 'document',
      exact: '',
      prefix: '',
      suffix: '',
      heading: '',
      blockIndex: null,
    };
  }

  if (scope === 'block') {
    return {
      scope: 'block',
      exact: '',
      prefix: '',
      suffix: '',
      heading: '',
      blockIndex: randomInt(0, 3),
    };
  }

  // text anchor
  const texts = [
    'This is important',
    'configuration options',
    'best practices',
    'common use case',
    'recommended approach',
  ];
  const exact = randomItem(texts);

  return {
    scope: 'text',
    exact,
    prefix: 'the ',
    suffix: ' for',
    heading: '',
    blockIndex: null,
  };
}

// Generate replies
function generateReplies(count) {
  const replies = [];
  for (let i = 0; i < count; i++) {
    replies.push({
      id: randomUUID(),
      author: randomItem(AUTHORS),
      content: randomItem([
        'Thanks for pointing that out!',
        'I\'ve updated the documentation.',
        'Good question, let me clarify...',
        'You\'re absolutely right, fixing now.',
        'I agree, this needs improvement.',
      ]),
      createdAt: randomDate(25),
    });
  }
  return replies;
}

// Generate comment
function generateComment() {
  const type = randomItem(COMMENT_TYPES);
  const typeWeights = { question: 0.4, suggestion: 0.35, issue: 0.25 };
  const rand = Math.random();
  const selectedType = rand < typeWeights.question ? 'question'
    : rand < (typeWeights.question + typeWeights.suggestion) ? 'suggestion'
    : 'issue';

  const status = Math.random() < 0.6 ? 'open' : 'resolved';
  const replyCount = status === 'resolved' ? randomInt(1, 3) : randomInt(0, 2);

  return {
    id: randomUUID(),
    anchor: generateAnchor(),
    author: randomItem(AUTHORS),
    type: selectedType,
    status,
    content: generateContent(selectedType),
    createdAt: randomDate(),
    replies: generateReplies(replyCount),
  };
}

// Find all markdown files
async function findMarkdownFiles(dir) {
  const files = [];
  const entries = await fs.readdir(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...await findMarkdownFiles(fullPath));
    } else if (entry.isFile() && entry.name.endsWith('.md')) {
      files.push(fullPath);
    }
  }

  return files;
}

// Convert file path to document path
function getDocumentPath(filePath) {
  const relative = path.relative(DOCS_DIR, filePath);
  return path.join('docs', relative).replace(/\.md$/, '').replace(/\\/g, '/');
}

// Get review file path
function getReviewFilePath(docPath) {
  return path.join(REVIEWS_DIR, `${docPath}.reviews.json`);
}

// Generate reviews for a document
async function generateReviewsForDoc(docPath) {
  const count = commentsPerDoc || randomInt(2, 5);
  const comments = [];

  for (let i = 0; i < count; i++) {
    comments.push(generateComment());
  }

  const reviewData = {
    documentPath: docPath,
    comments,
  };

  const reviewFile = getReviewFilePath(docPath);
  await fs.mkdir(path.dirname(reviewFile), { recursive: true });
  await fs.writeFile(reviewFile, JSON.stringify(reviewData, null, 2) + '\n');

  return comments.length;
}

// Main function
async function main() {
  console.log('🔄 Generating review comments...\n');

  // Clean existing reviews if requested
  if (clean) {
    console.log('🧹 Cleaning existing reviews...');
    try {
      await fs.rm(REVIEWS_DIR, { recursive: true, force: true });
      console.log('✅ Cleaned reviews directory\n');
    } catch (err) {
      // Directory might not exist, that's ok
    }
  }

  // Find all markdown files
  const markdownFiles = await findMarkdownFiles(DOCS_DIR);
  console.log(`📄 Found ${markdownFiles.length} documentation files\n`);

  // Generate reviews
  let totalComments = 0;
  const stats = {
    question: 0,
    suggestion: 0,
    issue: 0,
    open: 0,
    resolved: 0,
  };

  for (const file of markdownFiles) {
    const docPath = getDocumentPath(file);
    const count = await generateReviewsForDoc(docPath);
    totalComments += count;
    console.log(`  ✅ ${docPath} (${count} comments)`);

    // Update stats (re-read to count accurately)
    const reviewFile = getReviewFilePath(docPath);
    const data = JSON.parse(await fs.readFile(reviewFile, 'utf-8'));
    data.comments.forEach(comment => {
      stats[comment.type]++;
      stats[comment.status]++;
    });
  }

  // Print summary
  console.log('\n📊 Generation Summary:');
  console.log(`   Total documents: ${markdownFiles.length}`);
  console.log(`   Total comments: ${totalComments}`);
  console.log(`\n   By type:`);
  console.log(`     Questions: ${stats.question}`);
  console.log(`     Suggestions: ${stats.suggestion}`);
  console.log(`     Issues: ${stats.issue}`);
  console.log(`\n   By status:`);
  console.log(`     Open: ${stats.open}`);
  console.log(`     Resolved: ${stats.resolved}`);
  console.log('\n✨ Done!');
}

main().catch(err => {
  console.error('❌ Error:', err.message);
  process.exit(1);
});
