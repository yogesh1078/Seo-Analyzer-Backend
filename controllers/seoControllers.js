const seoService = require('../services/seoServices');

exports.analyzeSEO = async (req, res) => {
  try {
    const { text } = req.body;
    
    if (!text || text.trim() === '') {
      return res.status(400).json({ 
        error: 'Text is required for analysis',
        message: 'Please provide some content to analyze'
      });
    }
    
    console.log(`Analyzing text (${text.length} characters)...`);
    const results = await seoService.analyzeText(text);
    
    // Ensure we have valid results
    if (!results.keywords || results.keywords.length === 0) {
      console.warn('No keywords returned from service, using basic analysis');
      
      // Perform very basic analysis to extract at least some keywords
      const words = text.split(/\s+/).filter(word => word.length > 4);
      const uniqueWords = [...new Set(words)].slice(0, 5);
      
      results.keywords = uniqueWords.map((word, idx) => ({
        text: word,
        score: 0.9 - (idx * 0.1),
        type: 'Word'
      }));
    }
    
    console.log(`Analysis complete. Found ${results.keywords.length} keywords.`);
    return res.json(results);
  } catch (error) {
    console.error('Error in SEO analysis:', error);
    return res.status(500).json({ 
      error: 'Failed to analyze text',
      message: error.message 
    });
  }
};