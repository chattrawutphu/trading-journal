import { json } from '@sveltejs/kit';
import { OPENAI_API_KEY } from '$env/static/private';

// A helper function to delay (used for testing)
const delay = ms => new Promise(resolve => setTimeout(resolve, ms));

export async function POST({ request }) {
    try {
        // เพิ่มขนาด request body ที่รองรับ
        const rawBody = await request.text();
        let body;
        try {
            body = JSON.parse(rawBody);
        } catch (e) {
            return json({ error: 'Invalid JSON' }, { status: 400 });
        }
        
        const { messages } = body;
        
        // Guard against empty messages
        if (!messages || !Array.isArray(messages) || messages.length === 0) {
            return json({ error: 'Invalid messages format' }, { status: 400 });
        }
        
        // If you have an OpenAI API key set up:
        if (OPENAI_API_KEY) {
            const response = await fetch('https://api.openai.com/v1/chat/completions', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${OPENAI_API_KEY}`
                },
                body: JSON.stringify({
                    model: 'gpt-4o',  // หรือใช้ GPT-4 Turbo เพื่อรองรับข้อมูลมากขึ้น
                    messages: messages,
                    max_tokens: 2000, // เพิ่มขีดจำกัด token
                    temperature: 0.4,
                    system_message: "You are an expert trading coach and analyst specializing in technical analysis. Provide detailed, data-driven analysis of trades based on price action, chart patterns, and market conditions. Focus on identifying both strengths and areas for improvement in trading execution."
                })
            });
            
            if (!response.ok) {
                const error = await response.json();
                console.error('OpenAI API error:', error);
                return json({ 
                    error: 'Failed to get AI analysis', 
                    message: 'I apologize, but I encountered an error while analyzing your trade. Please try again later.'
                }, { status: 500 });
            }
            
            const data = await response.json();
            return json({ message: data.choices[0].message.content });
        } 
        else {
            // Fallback to mock response for testing (when no API key is available)
            await delay(1000); // Simulate API call delay
            
            // Extract the last user message
            const lastUserMessage = messages.filter(m => m.role === 'user').pop()?.content || '';
            
            // Generate appropriate mock response based on context
            let mockResponse;
            
            if (lastUserMessage.includes('analyze this trade')) {
                // Initial trade analysis with more detailed mock response
                mockResponse = `
# Comprehensive Trade Analysis

## Strengths
- Your entry at ${messages[1].content.match(/Entry Price: ([0-9.]+)/)?.[1] || 'your entry price'} aligned well with your strategy
- ${messages[1].content.includes('Stop Loss: ') ? 'You used proper risk management by setting a stop loss' : 'Your risk management could be improved by setting a clear stop loss'}
- ${messages[1].content.includes('Position History:') ? 'Your scaling approach shows thoughtful position management' : ''}

## Areas for Improvement
- ${!messages[1].content.includes('Stop Loss:') ? 'No defined stop loss indicates potential issues with risk management' : ''}
- ${!messages[1].content.includes('Take Profit:') ? 'No predefined profit target made your exit potentially reactive rather than planned' : ''}
- ${parseInt(messages[1].content.match(/Greed Level: ([0-9]+)/)?.[1] || '5') > 7 ? 'Your high greed level (${messages[1].content.match(/Greed Level: ([0-9]+)/)?.[1]}/10) may have impacted your decision-making' : ''}

## Risk Management Analysis
${messages[1].content.includes('Risk-Reward Ratio:') 
    ? `Your risk-reward ratio of ${messages[1].content.match(/Risk-Reward Ratio: ([0-9.]+)/)?.[1]} ${parseFloat(messages[1].content.match(/Risk-Reward Ratio: ([0-9.]+)/)?.[1] || '1') < 1.5 ? 'is below the recommended 1:2 minimum' : 'shows good trade selection'}` 
    : 'Without a defined risk-reward ratio, it\'s difficult to evaluate if this trade was worth taking'}

${messages[1].content.includes('PnL:') 
    ? (messages[1].content.match(/PnL: ([0-9.-]+)/)?.[1].startsWith('-') 
        ? 'Despite the losing outcome, what matters most is whether you followed your trading plan' 
        : 'While this trade was profitable, it\'s important to evaluate if you maximized the opportunity')
    : 'For open trades, consider setting trailing stops to protect profits if the market turns'}

## Psychological Factors
The combination of your ${messages[1].content.match(/Confidence Level: ([0-9]+)/)?.[1] || 'N/A'}/10 confidence level and ${messages[1].content.match(/Greed Level: ([0-9]+)/)?.[1] || 'N/A'}/10 greed level ${
    parseInt(messages[1].content.match(/Confidence Level: ([0-9]+)/)?.[1] || '5') < 5 && parseInt(messages[1].content.match(/Greed Level: ([0-9]+)/)?.[1] || '5') > 7 
    ? 'suggests you may have taken a trade you weren\'t confident in due to FOMO or greed' 
    : 'appears balanced and likely contributed to rational decision-making'
}

## Recommendations
1. ${!messages[1].content.includes('Stop Loss:') ? 'Always set a defined stop loss before entering a trade' : 'Continue using stop losses for every trade'}
2. ${!messages[1].content.includes('Take Profit:') ? 'Establish profit targets before entering trades to avoid emotional exits' : 'Your predefined profit targets show good planning'}
3. ${parseInt(messages[1].content.match(/Confidence Level: ([0-9]+)/)?.[1] || '5') < 6 ? 'Only take trades where your confidence level is 6 or higher' : 'Your confidence level shows good trade selection'}
4. ${messages[1].content.includes('Position History:') ? 'Your position management shows sophistication - continue to develop this skill' : 'Consider scaling in/out of positions rather than all-in/all-out entries and exits'}

Remember, consistency in process is more important than the outcome of any single trade. Your approach to ${messages[1].content.match(/Symbol: ([A-Z]+)/)?.[1] || 'this asset'} shows promise, but refinements to your execution will likely improve your results over time.`;
            } else if (lastUserMessage.toLowerCase().includes('how can i improve')) {
                // Improvement advice
                mockResponse = `
Based on this trade, here are specific improvements to consider:

1. **Set precise exit targets** - Define multiple take-profit levels before entering the trade
2. **Use technical levels for stops** - Your stop loss appears somewhat arbitrary; align it with meaningful support/resistance levels
3. **Track your emotional state** - You noted some anxiety during the trade; consider journaling your emotions during trades to identify patterns
4. **Review risk management** - The position size relative to your stop distance suggests higher risk than optimal; consider reducing size or widening stops based on volatility

I'd also recommend backtesting your strategy with these improvements to validate their effectiveness before implementing in live trading.`;
            } else if (lastUserMessage.toLowerCase().includes('why')) {
                // Explaining reasoning
                mockResponse = `
Looking at your trade, I can explain the likely reasons for its outcome:

The market was showing signs of **exhaustion at resistance** based on the price action before your entry. Your instinct to enter was correct, but the trade ultimately moved against you because:

1. Market conditions shifted during your hold period (increased volatility)
2. Support levels that should have held were broken due to broader market sentiment
3. Your stop was placed too tight relative to the asset's average volatility range

This isn't necessarily a bad trade - even with perfect analysis, not all trades will be winners. What matters is your process, which shows good foundational analysis but could use refinement in execution timing and position management.`;
            } else {
                // Generic follow-up response
                mockResponse = `
Based on the information about your trade, I can offer these observations:

Your ${messages[1].content.includes('LONG') ? 'long' : 'short'} position on ${messages[1].content.match(/Symbol: ([A-Z]+)/)?.[1] || 'this asset'} shows good technical analysis awareness but could benefit from more structured risk management protocols.

The most successful traders typically:

1. Follow a consistent, rules-based approach
2. Maintain position sizes appropriate to their account
3. Establish clear risk parameters before entry
4. Review both winning and losing trades with equal scrutiny

I'd recommend focusing on optimizing your trade management process after entry, as this appears to be where the greatest opportunity for improvement exists in your trading.

Would you like me to analyze any specific aspect of this trade in more detail?`;
            }
            
            return json({ message: mockResponse });
        }
        
    } catch (error) {
        console.error('Error processing AI request:', error);
        return json({
            error: 'Internal server error',
            message: 'Sorry, I experienced a technical issue. Please try again later.'
        }, { status: 500 });
    }
} 