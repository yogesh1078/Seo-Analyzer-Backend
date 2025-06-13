const axios = require('axios');

// TextRazor API for keyword extraction and analysis
const TEXT_RAZOR_API_KEY = process.env.TEXT_RAZOR_API_KEY || 'your_api_key_here'; // Replace with your actual API key
const TEXT_RAZOR_URL = 'https://api.textrazor.com/';

exports.analyzeText = async (text) => {
  try {
    // Call the TextRazor API
    console.log('Calling TextRazor API...');
    
    // Format the request data according to TextRazor requirements
    const formData = new URLSearchParams();
    formData.append('text', text);
    formData.append('extractors', 'entities,topics,words,phrases');
    formData.append('classifiers', 'textrazor_newscodes');
    
    const response = await axios({
      method: 'post',
      url: TEXT_RAZOR_URL,
      data: formData,
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'X-TextRazor-Key': TEXT_RAZOR_API_KEY
      }
    });

    console.log('TextRazor API response received');
    
    // Process the real API response to extract keywords and metrics
    const keywords = processApiResponse(response.data, text);
    const metrics = calculateMetrics(text, keywords);

    return {
      keywords,
      metrics,
    };
  } catch (error) {
    console.error('TextRazor API error:', error.message);
    
    if (error.response) {
      console.error('API Response:', error.response.data);
    }
    
    // If the API fails, fall back to basic text analysis
    return performBasicAnalysis(text);
  }
};

function processApiResponse(apiResponse, originalText) {
  const keywords = [];
  const processed = new Set();
  
  // Process entities
  if (apiResponse.response && apiResponse.response.entities) {
    apiResponse.response.entities
      .filter(entity => entity.relevanceScore > 0.5 && entity.matchedText)
      .forEach(entity => {
        if (!processed.has(entity.entityId)) {
          keywords.push({
            text: entity.entityId,
            score: entity.relevanceScore,
            type: entity.type ? entity.type[0] : 'Entity',
            frequency: entity.frequency || 1
          });
          processed.add(entity.entityId);
        }
      });
  }
  
  // Process topics
  if (apiResponse.response && apiResponse.response.topics) {
    apiResponse.response.topics
      .filter(topic => topic.score > 0.5)
      .forEach(topic => {
        if (!processed.has(topic.label)) {
          keywords.push({
            text: topic.label,
            score: topic.score,
            type: 'Topic',
            frequency: topic.frequency || 1
          });
          processed.add(topic.label);
        }
      });
  }
  
  // Add phrases if we need more keywords
  if (keywords.length < 10 && apiResponse.response && apiResponse.response.phrases) {
    apiResponse.response.phrases
      .filter(phrase => phrase.relevanceScore > 0.2 && phrase.words.length > 1)
      .slice(0, 15 - keywords.length)
      .forEach(phrase => {
        const phraseText = phrase.words.map(w => w.token).join(' ');
        if (!processed.has(phraseText)) {
          keywords.push({
            text: phraseText,
            score: phrase.relevanceScore,
            type: 'Phrase',
            frequency: 1
          });
          processed.add(phraseText);
        }
      });
  }
  
  // Sort by score and return top 15
  return keywords
    .sort((a, b) => b.score - a.score)
    .slice(0, 15);
}

function calculateMetrics(text, keywords) {
  const words = text.split(/\s+/).filter(Boolean);
  const wordCount = words.length;
  
  // Calculate readability (Flesch Reading Ease score)
  const sentences = text.split(/[.!?]+/).filter(Boolean);
  const sentenceCount = sentences.length || 1;
  const avgWordsPerSentence = wordCount / sentenceCount;
  
  // Calculate syllables (simplified approach)
  const syllableCount = words.reduce((count, word) => {
    return count + countSyllables(word);
  }, 0);
  
  const avgSyllablesPerWord = syllableCount / wordCount;
  
  // Flesch Reading Ease score
  const readabilityScore = 206.835 - (1.015 * avgWordsPerSentence) - (84.6 * avgSyllablesPerWord);
  
  // Keyword density calculation
  let keywordDensity = 0;
  if (keywords.length > 0) {
    // Get the most relevant keyword
    const topKeyword = keywords[0];
    const keywordText = topKeyword.text.toLowerCase();
    
    // Count occurrences
    let keywordOccurrences = 0;
    if (topKeyword.frequency) {
      keywordOccurrences = topKeyword.frequency;
    } else {
      // Compute frequency if not provided
      const keywordRegex = new RegExp('\\b' + keywordText.replace(/\s+/g, '\\s+') + '\\b', 'gi');
      const matches = text.match(keywordRegex);
      keywordOccurrences = matches ? matches.length : 0;
    }
    
    keywordDensity = (keywordOccurrences / wordCount) * 100;
  }
  
  return {
    readabilityScore: Math.max(0, Math.min(100, Math.round(readabilityScore))),
    keywordDensity: keywordDensity.toFixed(1),
    contentLength: wordCount,
    avgSentenceLength: avgWordsPerSentence.toFixed(1)
  };
}

function countSyllables(word) {
  word = word.toLowerCase().replace(/[^a-z]/g, '');
  if (!word) return 0;
  
  // Count vowel groups
  const vowels = word.match(/[aeiouy]{1,2}/g);
  let count = vowels ? vowels.length : 0;
  
  // Adjust for common endings
  if (word.match(/(?:[^laeiouy]es|ed|[^laeiouy]e)$/)) count--;
  if (word.match(/^[^aeiouy]*y$/)) count--;
  
  // Ensure at least one syllable per word
  return Math.max(count, 1);
}

function performBasicAnalysis(text) {
  console.log('Performing basic text analysis as fallback...');
  const words = text.split(/\s+/).filter(Boolean);
  const wordCount = words.length || 1;
  
  // Basic word frequency analysis
  const wordFreq = {};
  const stopWords = new Set(['the', 'and', 'a', 'an', 'in', 'on', 'at', 'to', 'for', 'of', 'with']);
  
  words.forEach(word => {
    const cleanWord = word.toLowerCase().replace(/[^\w\s]/g, '');
    if (cleanWord.length > 3 && !stopWords.has(cleanWord)) {
      wordFreq[cleanWord] = (wordFreq[cleanWord] || 0) + 1;
    }
  });
  
  // Extract keywords based on frequency
  const extractedKeywords = Object.entries(wordFreq)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([word, freq], idx) => ({
      text: word,
      score: Math.max(0.5, 1 - (idx * 0.05)),
      type: 'Keyword',
      frequency: freq
    }));
  
  // Extract phrases (2-word combinations)
  const phrases = [];
  for (let i = 0; i < words.length - 1; i++) {
    const word1 = words[i].toLowerCase().replace(/[^\w\s]/g, '');
    const word2 = words[i+1].toLowerCase().replace(/[^\w\s]/g, '');
    
    if (word1.length > 3 && word2.length > 3 && !stopWords.has(word1) && !stopWords.has(word2)) {
      const phrase = `${word1} ${word2}`;
      phrases.push(phrase);
    }
  }
  
  // Count phrase frequencies
  const phraseFreq = {};
  phrases.forEach(phrase => {
    phraseFreq[phrase] = (phraseFreq[phrase] || 0) + 1;
  });
  
  // Extract top phrases
  const extractedPhrases = Object.entries(phraseFreq)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([phrase, freq], idx) => ({
      text: phrase,
      score: Math.max(0.6, 0.95 - (idx * 0.05)),
      type: 'Phrase',
      frequency: freq
    }));
  
  // Combine keywords and phrases
  const allKeywords = [...extractedKeywords, ...extractedPhrases]
    .sort((a, b) => b.score - a.score)
    .slice(0, 15);
  
  // Calculate metrics
  const metrics = calculateMetrics(text, allKeywords);
  
  return {
    keywords: allKeywords,
    metrics
  };
}