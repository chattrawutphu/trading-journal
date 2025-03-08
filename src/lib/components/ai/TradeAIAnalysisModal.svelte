<script>
    import { fade, fly, slide } from 'svelte/transition';
    import { createEventDispatcher } from 'svelte';
    import { onMount, onDestroy } from 'svelte';
    import AskAIButton from '$lib/components/ai/AskAiButton.svelte';
    
    const dispatch = createEventDispatcher();
    
    export let show = false;
    export let trade = null;
    export let chartData = [];
    
    let messages = [];
    let userInput = '';
    let loading = false;
    let error = null;
    let chatBoxRef;
    
    let userIsScrolling = false;
    let shouldAutoScroll = true;
    
    // Track dark mode (ideally this would come from your app's theme system)
    let darkMode = false;
    
    // เพิ่มตัวแปรเก็บรายการคำถามด่วน
    const quickQuestions = [
        { id: 'support-resistance', text: 'Identify key support and resistance levels', 
          prompt: 'Analyze the chart data and identify the most important support and resistance levels. Explain why these levels are significant and how they might impact future price action.' },
        
        { id: 'trend-analysis', text: 'Analyze market trend and momentum', 
          prompt: 'What is the current trend direction and strength? Are there any signs of trend reversal or continuation? Analyze the momentum indicators and provide your assessment.' },
        
        { id: 'entry-points', text: 'Suggest better entry points', 
          prompt: 'Based on the chart data, were there better entry points for this trade? When would have been the optimal entry point and why?' },
        
        { id: 'exit-strategy', text: 'Recommend exit strategy', 
          prompt: 'What would be an optimal exit strategy for this position? Suggest take profit and stop loss levels with clear reasoning.' },
        
        { id: 'risk-management', text: 'Evaluate risk management', 
          prompt: 'Evaluate the risk management of this trade. What position size would be appropriate? What would be the ideal risk-reward ratio? How could I have better managed the risk?' },
        
        { id: 'pattern-analysis', text: 'Identify chart patterns', 
          prompt: 'Are there any significant chart patterns visible in this data? Identify and explain any bullish or bearish patterns and their implications.' }
    ];
    
    // เพิ่มตัวแปรเก็บสถานะการแสดงข้อความเต็ม/ย่อ
    let expandedMessages = {};
    
    // Add variable to track scroll position of questions
    let questionsContainer;
    
    // Function to scroll questions to the right
    function scrollQuestionsRight() {
        if (questionsContainer) {
            questionsContainer.scrollBy({ left: 200, behavior: 'smooth' });
        }
    }
    
    // Function to scroll questions to the left
    function scrollQuestionsLeft() {
        if (questionsContainer) {
            questionsContainer.scrollBy({ left: -200, behavior: 'smooth' });
        }
    }
    
    // Function to check if scroll buttons should be visible
    let showLeftScroll = false;
    let showRightScroll = true;
    
    function updateScrollButtons() {
        if (!questionsContainer) return;
        
        // Show left button if we're not at the start
        showLeftScroll = questionsContainer.scrollLeft > 10;
        
        // Show right button if we're not at the end
        showRightScroll = questionsContainer.scrollLeft + questionsContainer.clientWidth < questionsContainer.scrollWidth - 10;
    }
    
    // ฟังก์ชันตรวจสอบความยาวข้อความและตัดให้สั้นลง
    function truncateMessage(content, maxLength = 500) {
        if (content.length <= maxLength) return content;
        return content.substring(0, maxLength) + '...';
    }
    
    // ฟังก์ชันสลับการแสดงข้อความแบบเต็ม/ย่อ
    function toggleMessageExpansion(messageId) {
        expandedMessages = {
            ...expandedMessages,
            [messageId]: !expandedMessages[messageId]
        };
    }
    
    // ฟังก์ชันปิด modal - แก้ไขให้ปิดได้
    function close() {
        show = false;
        dispatch('close');
    }
    
    // ฟังก์ชัน scroll to bottom
    function scrollToBottom() {
        if (chatBoxRef && shouldAutoScroll) {
            setTimeout(() => {
                chatBoxRef.scrollTop = chatBoxRef.scrollHeight;
            }, 100);
        }
    }
    
    // แก้ไขฟังก์ชัน handleSubmit
    function handleSubmit() {
        if (userInput.trim()) {
            analyzeTradeWithAI(userInput);
            userInput = '';
        }
    }
    
    // ฟังก์ชันขยาย textarea อัตโนมัติ
    function autoGrow(e) {
        e.target.style.height = 'auto';
        e.target.style.height = Math.min(e.target.scrollHeight, 150) + 'px';
    }
    
    // ฟังก์ชันคำนวณระยะเวลาเทรด (เพิ่มใหม่)
    function calculateDuration(trade) {
        if (!trade.entryDate) return null;
        
        const entryDate = new Date(trade.entryDate);
        const exitDate = trade.exitDate ? new Date(trade.exitDate) : new Date();
        
        const durationMs = exitDate - entryDate;
        const durationHours = durationMs / (1000 * 60 * 60);
        
        if (durationHours < 24) {
            return `Duration: ${Math.round(durationHours)} hours`;
        } else {
            const durationDays = durationHours / 24;
            return `Duration: ${Math.round(durationDays)} days`;
        }
    }
    
    // ฟังก์ชันคำนวณ Risk/Reward Ratio (เพิ่มใหม่)
    function calculateRiskRewardRatio(trade) {
        if (!trade.hasStopLoss || !trade.hasTakeProfit || !trade.stopLoss || !trade.takeProfit || !trade.entryPrice) {
            return null;
        }
        
        const entryPrice = parseFloat(trade.entryPrice);
        const stopLoss = parseFloat(trade.stopLoss);
        const takeProfit = parseFloat(trade.takeProfit);
        
        if (isNaN(entryPrice) || isNaN(stopLoss) || isNaN(takeProfit)) {
            return null;
        }
        
        let risk, reward;
        
        if (trade.side === 'LONG') {
            risk = Math.abs(entryPrice - stopLoss);
            reward = Math.abs(takeProfit - entryPrice);
        } else { // SHORT
            risk = Math.abs(stopLoss - entryPrice);
            reward = Math.abs(entryPrice - takeProfit);
        }
        
        if (risk === 0) return null;
        
        const ratio = (reward / risk).toFixed(2);
        return `Risk/Reward Ratio: ${ratio}`;
    }
    
    // ฟังก์ชันจัดรูปแบบประวัติตำแหน่ง (เพิ่มใหม่)
    function formatPositionHistory(positions) {
        if (!positions || positions.length === 0) return '';
        
        return positions.map((pos, index) => {
            return `Position ${index + 1}: ${pos.action} - ${pos.percentage}% at price ${pos.price}`;
        }).join('\n        ');
    }
    
    // Initial prompt to analyze the trade with complete information
    const getInitialPrompt = (trade) => {
        // ข้อมูลพื้นฐานของเทรด
        const tradeInfo = [];
        tradeInfo.push(`Symbol: ${trade.symbol}`);
        tradeInfo.push(`Side: ${trade.side}`);
        tradeInfo.push(`Status: ${trade.status}`);
        
        if (trade.entryPrice) tradeInfo.push(`Entry Price: ${trade.entryPrice}`);
        if (trade.exitPrice) tradeInfo.push(`Exit Price: ${trade.exitPrice}`);
        
        // คำนวณ PnL ถ้าเทรดปิดไปแล้ว
        if (trade.status === 'CLOSED' && trade.pnl) {
            tradeInfo.push(`PnL: ${trade.pnl}`);
        }
        
        // คำนวณระยะเวลาเทรด
        const duration = calculateDuration(trade);
        if (duration) tradeInfo.push(duration);
        
        // เพิ่มข้อมูลอื่นๆ ถ้ามี (เฉพาะที่ไม่ว่างเปล่า)
        if (trade.amount) tradeInfo.push(`Amount: ${trade.amount}`);
        
        if (trade.hasStopLoss && trade.stopLoss) {
            tradeInfo.push(`Stop Loss: ${trade.stopLoss}`);
        }
        
        if (trade.hasTakeProfit && trade.takeProfit) {
            tradeInfo.push(`Take Profit: ${trade.takeProfit}`);
        }
        
        // คำนวณ Risk/Reward Ratio ถ้ามีทั้ง SL และ TP
        const riskRewardRatio = calculateRiskRewardRatio(trade);
        if (riskRewardRatio) tradeInfo.push(riskRewardRatio);
        
        // ข้อมูลเกี่ยวกับการวางแผนและจิตวิทยา
        const tradePsychology = [];
        if (trade.strategy) tradePsychology.push(`Strategy: ${trade.strategy}`);
        if (trade.entryReason) tradePsychology.push(`Entry Reason: ${trade.entryReason}`);
        if (trade.exitReason) tradePsychology.push(`Exit Reason: ${trade.exitReason}`);
        
        if (trade.confidenceLevel) tradePsychology.push(`Confidence Level: ${trade.confidenceLevel}/10`);
        if (trade.greedLevel) tradePsychology.push(`Greed Level: ${trade.greedLevel}/10`);
        if (trade.emotions) tradePsychology.push(`Emotions: ${trade.emotions}`);
        
        if (trade.tags && trade.tags.length > 0) {
            tradePsychology.push(`Tags: ${trade.tags.join(', ')}`);
        }
        
        // ข้อมูลการจัดการตำแหน่ง
        const positionManagement = [];
        if (trade.positionHistory && trade.positionHistory.length > 0) {
            const formattedPositionHistory = formatPositionHistory(trade.positionHistory);
            positionManagement.push(`Position History:\n        ${formattedPositionHistory}`);
        }
        
        // รวมส่วนเพิ่มเติม
        const additionalInfo = [];
        if (trade.notes) additionalInfo.push(`Notes: ${trade.notes}`);
        
        // สร้างข้อความโปรมต์
        const marketContext = getMarketContextFromChartData(chartData, trade);
        
        let prompt = `I need a comprehensive analysis of this trade:`;
        
        // เพิ่มเฉพาะหัวข้อที่มีข้อมูล
        if (tradeInfo.length > 0) {
            prompt += `\n\n## Basic Trade Information\n${tradeInfo.join('\n')}`;
        }
        
        if (tradePsychology.length > 0) {
            prompt += `\n\n## Trade Planning and Psychology\n${tradePsychology.join('\n')}`;
        }
        
        if (positionManagement.length > 0) {
            prompt += `\n\n## Position Management\n${positionManagement.join('\n')}`;
        }
        
        if (marketContext) {
            prompt += `\n\n## Market Context (Price Data)\nMarket Conditions:\n        ${marketContext}`;
        } else {
            prompt += `\n\n## Market Context\nNo market data available`;
        }
        
        if (additionalInfo.length > 0) {
            prompt += `\n\n## Additional Information\n${additionalInfo.join('\n')}`;
        }
        
        prompt += `\n\nPlease provide a detailed analysis of this trade considering:
1. Entry and exit decisions based on the market context and price action
2. Risk management (stop loss, position sizing)
3. Trade management (scaling in/out, holding time)
4. Psychological factors (confidence, greed, emotions)
5. Overall execution quality

Then provide actionable recommendations for improvement. Be specific and direct in your feedback.`;

        return prompt;
    };
    
    // แก้ไขฟังก์ชันให้ส่งแท่งเทียนในรูปแบบที่ประหยัดพื้นที่มากขึ้น
    function getMarketContextFromChartData(chartData, trade) {
        if (!chartData || chartData.length === 0) {
            return null;
        }
        
        // หาเวลาเริ่มต้นและสิ้นสุดของเทรด
        const entryDate = new Date(trade.entryDate);
        const exitDate = trade.exitDate ? new Date(trade.exitDate) : new Date();
        
        // จัดเรียงข้อมูลตามเวลา
        const sortedCandles = [...chartData].sort((a, b) => new Date(a.time) - new Date(b.time));
        
        // เก็บเวลาเริ่มต้นและสิ้นสุดของชุดข้อมูล
        const startTime = new Date(sortedCandles[0].time).getTime();
        const endTime = new Date(sortedCandles[sortedCandles.length - 1].time).getTime();
        
        // สร้างข้อความสรุปเบื้องต้นเกี่ยวกับตลาด
        const marketSummary = analyzeMarketConditions(sortedCandles, trade);
        
        // ฟังก์ชันหาแท่งเทียนที่อยู่ใกล้เวลาที่กำหนด
        function findCandleNearTime(candles, targetTime) {
            if (!candles || candles.length === 0) return null;
            
            return candles.reduce((closest, current) => {
                const currentDiff = Math.abs(new Date(current.time) - targetTime);
                const closestDiff = Math.abs(new Date(closest.time) - targetTime);
                return currentDiff < closestDiff ? current : closest;
            });
        }
        
        // แท่งเทียนที่สำคัญ (เช่น จุด entry, exit)
        const entryCandle = findCandleNearTime(sortedCandles, entryDate);
        const exitCandle = trade.exitDate ? findCandleNearTime(sortedCandles, exitDate) : null;
        
        // ประมาณ timeframe จากข้อมูล (หากมีมากกว่า 1 แท่ง)
        let timeframe = trade.timeframe || '1m';
        if (sortedCandles.length > 1) {
            const timeDiff = (new Date(sortedCandles[1].time) - new Date(sortedCandles[0].time)) / (1000 * 60);
            if (timeDiff >= 1440) timeframe = Math.round(timeDiff/1440) + 'd';
            else if (timeDiff >= 60) timeframe = Math.round(timeDiff/60) + 'h';
            else timeframe = Math.round(timeDiff) + 'm';
        }
        
        // หาดัชนี (index) ของแท่งเทียนสำคัญ
        const entryIndex = sortedCandles.findIndex(c => c.time === entryCandle?.time);
        const exitIndex = exitCandle ? sortedCandles.findIndex(c => c.time === exitCandle.time) : -1;
        
        // คำนวณจำนวนแท่งที่ต้องการ (เฉพาะในช่วงที่สำคัญ)
        const relevantRange = 20; // จำนวนแท่งก่อนและหลัง entry ที่ต้องการแสดง
        const startIndex = Math.max(0, entryIndex - relevantRange);
        const endIndex = exitIndex > -1 
            ? Math.min(sortedCandles.length - 1, exitIndex + relevantRange) 
            : Math.min(sortedCandles.length - 1, entryIndex + relevantRange);
        
        // ตัดเฉพาะแท่งเทียนในช่วงที่สนใจ
        const relevantCandles = sortedCandles.slice(startIndex, endIndex + 1);
        
        // สร้างคำอธิบายโครงสร้างข้อมูลแบบกระชับ
        const dataInfo = {
            tf: timeframe,
            st: new Date(startTime).toISOString(),
            et: new Date(endTime).toISOString(),
            fmt: "OHLCVN", // O=open, H=high, L=low, C=close, V=volume, N=note
            note: "0=regular, 1=entry, 2=exit"
        };
        
        // ข้อมูลสำคัญเกี่ยวกับการเทรด (ตัดฟิลด์ว่าง)
        const tradeInfo = {};
        
        // เพิ่มเฉพาะฟิลด์ที่มีค่า
        if (trade.symbol) tradeInfo.sym = trade.symbol;
        if (trade.side) tradeInfo.side = trade.side;
        if (trade.entryPrice) tradeInfo.entryPrice = Number(trade.entryPrice);
        if (trade.exitPrice) tradeInfo.exitPrice = Number(trade.exitPrice);
        if (trade.status) tradeInfo.status = trade.status;
        if (entryIndex >= 0) tradeInfo.entryIndex = entryIndex - startIndex; // ปรับให้เป็น index ในชุดข้อมูลใหม่
        if (exitIndex >= 0) tradeInfo.exitIndex = exitIndex - startIndex; // ปรับให้เป็น index ในชุดข้อมูลใหม่

        // ส่งข้อมูลแท่งเทียนในรูปแบบที่ประหยัดพื้นที่มากขึ้น (ไม่มี timestamp, ลดทศนิยม)
        const compactCandles = relevantCandles.map((candle) => {
            // หาว่าแท่งนี้เป็นแท่ง entry หรือ exit หรือไม่
            const isEntryCandle = entryCandle && entryCandle.time === candle.time;
            const isExitCandle = exitCandle && exitCandle.time === candle.time;
            
            // กำหนดค่า note (0=regular, 1=entry, 2=exit)
            let note = 0;
            if (isEntryCandle) note = 1;
            if (isExitCandle) note = 2;
            
            // สร้าง array ข้อมูลกระชับ: [open, high, low, close, volume, note] และลดทศนิยม
            return [
                Number(candle.open).toFixed(4),
                Number(candle.high).toFixed(4),
                Number(candle.low).toFixed(4),
                Number(candle.close).toFixed(4),
                candle.volume ? Math.round(Number(candle.volume)) : null,
                note
            ];
        });
        
        // รวมข้อมูลทั้งหมดแบบกระชับไม่มี whitespace
        return `Market Summary: ${marketSummary}

Data Info: ${JSON.stringify(dataInfo)}

Trade: ${JSON.stringify(tradeInfo)}

Candles: ${JSON.stringify(compactCandles)}`;
    }
    
    // ฟังก์ชันวิเคราะห์สภาวะตลาดจากแท่งเทียน
    function analyzeMarketConditions(candles, trade) {
        if (!candles || candles.length < 10) return "Insufficient data for market analysis";
        
        // จำนวนแท่งที่จะวิเคราะห์ (เช่น 30 แท่งล่าสุด)
        const recentCandles = candles.slice(-30);
        
        // คำนวณแนวโน้มราคา
        const firstPrice = recentCandles[0].close;
        const lastPrice = recentCandles[recentCandles.length - 1].close;
        const priceChange = ((lastPrice - firstPrice) / firstPrice) * 100;
        
        // คำนวณความผันผวน
        const prices = recentCandles.map(c => c.close);
        const avgPrice = prices.reduce((sum, price) => sum + price, 0) / prices.length;
        const volatility = Math.sqrt(prices.reduce((sum, price) => sum + Math.pow(price - avgPrice, 2), 0) / prices.length) / avgPrice * 100;
        
        // วิเคราะห์ปริมาณการซื้อขาย
        const volumes = recentCandles.filter(c => c.volume).map(c => c.volume);
        if (volumes.length === 0) return `Market trend: ${priceChange > 0 ? 'Uptrend' : priceChange < 0 ? 'Downtrend' : 'Sideways'} (${priceChange.toFixed(2)}%), Volatility: ${volatility.toFixed(2)}%, Volume data not available`;
        
        const avgVolume = volumes.reduce((sum, vol) => sum + vol, 0) / volumes.length;
        
        // ดูแนวโน้มปริมาณการซื้อขาย
        const firstHalf = volumes.slice(0, Math.floor(volumes.length / 2));
        const secondHalf = volumes.slice(Math.floor(volumes.length / 2));
        
        const firstHalfAvg = firstHalf.reduce((sum, vol) => sum + vol, 0) / firstHalf.length;
        const secondHalfAvg = secondHalf.reduce((sum, vol) => sum + vol, 0) / secondHalf.length;
        
        let volumeTrend = "";
        if (secondHalfAvg > firstHalfAvg * 1.3) volumeTrend = "Volume was increasing during this period, suggesting strengthening trend";
        else if (secondHalfAvg < firstHalfAvg * 0.7) volumeTrend = "Volume was decreasing during this period, suggesting weakening trend";
        else volumeTrend = "Volume was relatively stable during this period";
        
        return `Market trend: ${priceChange > 0 ? 'Uptrend' : priceChange < 0 ? 'Downtrend' : 'Sideways'} (${priceChange.toFixed(2)}%), Volatility: ${volatility.toFixed(2)}%, ${volumeTrend}`;
    }
    
    // Add initial AI message when modal is shown
    $: if (show && trade && messages.length === 0) {
        const initialPrompt = getInitialPrompt(trade);
        messages = [
            { role: 'system', content: 'I am an AI trading analyst. I can help analyze your trades and provide suggestions for improvement.' },
            { role: 'user', content: initialPrompt }
        ];
        analyzeTradeWithAI(initialPrompt);
    }
    
    // Send data to OpenAI API (we'll create this endpoint later)
    async function analyzeTradeWithAI(prompt) {
        if (!prompt) return;
        
        // Show loading state
        loading = true;
        error = null;
        
        try {
            // Add user message if this isn't the initial prompt
            if (prompt !== getInitialPrompt(trade)) {
                messages = [...messages, { role: 'user', content: prompt }];
                // เมื่อผู้ใช้ส่งข้อความใหม่ ให้เลื่อนลงด้านล่าง
                shouldAutoScroll = true;
                scrollToBottom();
            }
            
            const response = await fetch('/api/ai/analyze-trade', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    messages: messages
                }),
            });
            
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || 'Failed to get AI analysis');
            }
            
            const data = await response.json();
            
            // Add AI response to messages
            messages = [...messages, { role: 'assistant', content: data.message }];
            userInput = '';
            
            // เมื่อได้รับการตอบกลับ ให้เลื่อนลงด้านล่างถ้าผู้ใช้ยังไม่ได้เลื่อขึ้นด้านบนเอง
            if (shouldAutoScroll) {
                scrollToBottom();
            }
            
        } catch (err) {
            console.error('Error analyzing trade:', err);
            error = err.message || 'Failed to analyze trade';
        } finally {
            loading = false;
        }
    }
    
    function handleKeyDown(e) {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSubmit();
        }
    }
    
    // ตรวจจับเมื่อผู้ใช้กำลังเลื่อนหน้าจอ
    function handleScroll() {
        if (chatBoxRef) {
            const { scrollTop, scrollHeight, clientHeight } = chatBoxRef;
            // ถ้าผู้ใช้เลื่อนขึ้นด้านบน (ไม่ได้อยู่ที่ด้านล่างสุด)
            if (scrollTop + clientHeight < scrollHeight - 80) {
                shouldAutoScroll = false;
            } else {
                shouldAutoScroll = true;
            }
        }
    }
    
    // เพิ่ม effect watcher สำหรับ messages
    $: if (messages.length > 0) {
        scrollToBottom();
    }
    
    // Keyboard shortcut to close modal with Escape
    function handleKeypress(e) {
        if (e.key === 'Escape') {
            close();
        }
    }
    
    onMount(() => {
        window.addEventListener('keydown', handleKeypress);
    });
    
    onDestroy(() => {
        window.removeEventListener('keydown', handleKeypress);
    });
    
    // Function to convert markdown in AI responses to HTML
    function markdownToHtml(markdown) {
        if (!markdown) return '';
        
        // Convert headers
        let html = markdown
            .replace(/^### (.*$)/gim, '<h3 class="text-lg font-semibold mt-4 mb-2">$1</h3>')
            .replace(/^## (.*$)/gim, '<h2 class="text-xl font-bold mt-5 mb-2">$1</h2>')
            .replace(/^# (.*$)/gim, '<h1 class="text-2xl font-bold mt-6 mb-3">$1</h1>');
            
        // Convert bold and italic
        html = html
            .replace(/\*\*(.*?)\*\*/gim, '<strong>$1</strong>')
            .replace(/\*(.*?)\*/gim, '<em>$1</em>')
            .replace(/__(.*?)__/gim, '<strong>$1</strong>')
            .replace(/_(.*?)_/gim, '<em>$1</em>');
            
        // Convert code blocks and inline code
        html = html
            .replace(/```([\s\S]*?)```/g, '<pre class="bg-light-hover dark:bg-dark-hover p-3 my-3 rounded-md overflow-x-auto"><code>$1</code></pre>')
            .replace(/`(.*?)`/g, '<code class="bg-light-hover dark:bg-dark-hover px-1 py-0.5 rounded">$1</code>');
            
        // Convert lists
        html = html
            .replace(/^\s*\n\*/gm, '<ul>\n*')
            .replace(/^\s*\n-/gm, '<ul>\n-')
            .replace(/^\*(.+)/gm, '<li>$1</li>')
            .replace(/^-(.+)/gm, '<li>$1</li>')
            .replace(/^\s*\n([0-9]+)\./gm, '<ol>\n$1.')
            .replace(/^([0-9]+)\.(.+)/gm, '<li>$2</li>')
            .replace(/<\/ul>\s*\n<ul>/g, '')
            .replace(/<\/ol>\s*\n<ol>/g, '')
            .replace(/<\/li>\s*\n?<\/ul>/g, '</li></ul>')
            .replace(/<\/li>\s*\n?<\/ol>/g, '</li></ol>');
            
        // Convert paragraphs
        const paragraphs = html.split(/\n\s*\n/);
        html = paragraphs.map(p => {
            // Skip if already contains HTML tags
            if (p.trim().startsWith('<') || p.trim() === '') return p;
            return `<p>${p}</p>`;
        }).join('\n\n');
        
        // Handle inline line breaks
        html = html.replace(/\n(?!<)/g, '<br>');
        
        return html;
    }
    
    // คืนค่า auto-scroll เมื่อเปิด modal ใหม่
    $: if (show) {
        shouldAutoScroll = true;
    }
    
    // เพิ่มฟังก์ชัน handleQuickQuestion
    function handleQuickQuestion(question) {
        analyzeTradeWithAI(question.prompt);
    }
    
    // Add the missing formatMarkdown function
    function formatMarkdown(markdown) {
        return markdownToHtml(markdown);
    }
</script>

<!-- Modal with background style matching TradeModal -->
<div 
    class="fixed inset-0 bg-black/70 backdrop-blur-md z-[200] flex items-center justify-center p-4 overflow-y-auto"
    class:hidden={!show}
    transition:fade={{ duration: 250 }}
    on:click|self={close}
>
    <div 
        class="w-full max-w-4xl card shadow-2xl overflow-hidden flex flex-col h-[85vh] my-auto relative border border-light-border/30 dark:border-dark-border/30 rounded-2xl"
        in:fly={{ y: 20, duration: 350, easing: (t) => --t * t * t + 1 }}
        out:fly={{ y: 20, duration: 250 }}
    >
        <!-- Header - Enhanced styling -->
        <div class="px-6 py-4 border-b border-light-border dark:border-dark-border flex items-center justify-between bg-gradient-to-r from-light-card to-light-card/80 dark:from-dark-card dark:to-dark-card/90">
            <div class="flex items-center gap-3">
                <div class="bg-gradient-to-br from-theme-500 to-theme-600 p-2.5 rounded-full shadow-lg">
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="text-white">
                        <path d="M9.937 15.5A2 2 0 0 0 8.5 14.063l-6.135-1.582a.5.5 0 0 1 0-.962L8.5 9.936A2 2 0 0 0 9.937 8.5l1.582-6.135a.5.5 0 0 1 .963 0L14.063 8.5A2 2 0 0 0 15.5 9.937l6.135 1.581a.5.5 0 0 1 0 .964L15.5 14.063a2 2 0 0 0-1.437 1.437l-1.582 6.135a.5.5 0 0 1-.963 0z"></path>
                    </svg>
                </div>
                
                <div>
                    <h2 class="text-xl font-bold text-light-text dark:text-dark-text flex items-center gap-2">
                        AI Trade Analysis
                        {#if trade}
                            <span class="inline-flex items-center gap-1.5 ml-2 px-3 py-1 bg-light-hover/50 dark:bg-dark-hover/50 rounded-full text-sm font-medium shadow-sm">
                                <span class="w-2.5 h-2.5 rounded-full {trade.side === 'LONG' ? 'bg-green-500 shadow-green-500/20' : 'bg-red-500 shadow-red-500/20'} shadow-lg"></span>
                                {trade.symbol} {trade.side}
                            </span>
                        {/if}
                    </h2>
                </div>
            </div>
            
            <!-- Close button - Enhanced styling -->
            <button 
                class="p-2 rounded-lg text-light-text-muted dark:text-dark-text-muted hover:text-theme-500 hover:bg-light-hover dark:hover:bg-dark-hover transition-all duration-200"
                on:click={close}
                aria-label="Close"
            >
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M18 6L6 18"></path>
                    <path d="M6 6l12 12"></path>
                </svg>
            </button>
        </div>
        
        <!-- Chat Content - Enhanced styling -->
        <div class="flex-1 overflow-hidden flex flex-col bg-light-bg/50 dark:bg-dark-bg/50">
            <!-- Messages -->
            <div class="flex-1 overflow-y-auto max-h-[calc(75vh-8rem)] p-5 bg-light-bg/70 dark:bg-dark-bg/70" bind:this={chatBoxRef} on:scroll={handleScroll}>
                {#if messages.length > 0}
                    <div class="space-y-6">
                        {#each messages as message, index}
                            {#if message.role !== 'system'}
                                <div 
                                    class="flex {message.role === 'user' ? 'justify-end' : 'justify-start'}"
                                    transition:fade={{ duration: 200 }}
                                >
                                    <div 
                                        class="max-w-[85%] p-4 rounded-xl shadow-md {
                                            message.role === 'user' 
                                                ? 'bg-gradient-to-br from-theme-500 to-theme-600 text-white rounded-tr-none' 
                                                : 'bg-light-card dark:bg-dark-card text-light-text dark:text-dark-text rounded-tl-none border border-light-border/20 dark:border-dark-border/20'
                                        }"
                                    >
                                        {#if message.role === 'user'}
                                            <!-- User message formatting -->
                                            {#if message.content.length > 500 && !expandedMessages[index]}
                                                <div>
                                                    {truncateMessage(message.content)}
                                                    <button 
                                                        on:click={() => toggleMessageExpansion(index)}
                                                        class="text-white/80 hover:text-white underline text-xs mt-1 block font-medium transition-colors"
                                                    >
                                                        Show more
                                                    </button>
                                                </div>
                                            {:else if message.content.length > 500}
                                                <div>
                                                    {message.content}
                                                    <button 
                                                        on:click={() => toggleMessageExpansion(index)}
                                                        class="text-white/80 hover:text-white underline text-xs mt-2 block font-medium transition-colors"
                                                    >
                                                        Show less
                                                    </button>
                                                </div>
                                            {:else}
                                                {message.content}
                                            {/if}
                                        {:else}
                                            <!-- AI message formatting with enhanced styling -->
                                            <div class="chat-message prose prose-sm dark:prose-invert" style="max-width: 100%;">
                                                {@html formatMarkdown(message.content)}
                                            </div>
                                        {/if}
                                    </div>
                                </div>
                            {/if}
                        {/each}
                    </div>
                {/if}
                
                <!-- Loading indicator with enhanced styling -->
                {#if loading && (!messages.length || messages[messages.length - 1].role !== 'assistant')}
                    <div class="flex justify-start mt-4" transition:fade>
                        <div class="bg-light-card dark:bg-dark-card rounded-xl rounded-tl-none p-4 shadow-md max-w-[85%] border border-light-border/20 dark:border-dark-border/20">
                            <div class="typing-indicator">
                                <span></span>
                                <span></span>
                                <span></span>
                            </div>
                        </div>
                    </div>
                {/if}
                
                <!-- Error message with enhanced styling -->
                {#if error}
                    <div class="bg-red-100 dark:bg-red-900/20 border border-red-200 dark:border-red-700 text-red-600 dark:text-red-400 rounded-lg p-4 mt-4 shadow-md">
                        <div class="flex items-center gap-2">
                            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                <circle cx="12" cy="12" r="10"></circle>
                                <line x1="12" y1="8" x2="12" y2="12"></line>
                                <line x1="12" y1="16" x2="12.01" y2="16"></line>
                            </svg>
                            {error}
                        </div>
                    </div>
                {/if}
            </div>
            
            <!-- Compact Quick Questions section in a single row -->
            <div class="w-full border-t border-light-border dark:border-dark-border bg-light-card/50 dark:bg-dark-card/50 relative">
                <div class="flex items-center px-2">
                    <!-- Left scroll button -->
                    {#if showLeftScroll}
                        <button 
                            on:click={scrollQuestionsLeft}
                            class="flex-shrink-0 z-10 p-1.5 my-1.5 rounded-full bg-light-bg dark:bg-dark-bg hover:bg-light-hover dark:hover:bg-dark-hover transition-colors shadow-sm text-light-text dark:text-dark-text"
                            aria-label="Scroll left"
                            transition:fade={{ duration: 150 }}
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                <path d="m15 18-6-6 6-6"/>
                            </svg>
                        </button>
                    {/if}
                    
                    <!-- Questions container - horizontally scrollable -->
                    <div 
                        class="flex items-center gap-2 py-2 px-2 overflow-x-auto no-scrollbar relative flex-grow"
                        bind:this={questionsContainer}
                        on:scroll={updateScrollButtons}
                    >
                        <p class="whitespace-nowrap text-xs font-medium text-theme-500 flex items-center gap-1.5 pr-1 flex-shrink-0">
                            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                <circle cx="12" cy="12" r="10"></circle>
                                <line x1="12" y1="16" x2="12" y2="12"></line>
                                <line x1="12" y1="8" x2="12.01" y2="8"></line>
                            </svg>
                            Quick Questions:
                        </p>
                        
                        {#each quickQuestions as question}
                            <button
                                on:click={() => handleQuickQuestion(question)}
                                class="whitespace-nowrap text-xs px-2.5 py-1 rounded-full bg-light-bg dark:bg-dark-bg hover:bg-light-hover dark:hover:bg-dark-hover transition-colors border border-light-border/30 dark:border-dark-border/30 shadow-sm hover:shadow-md text-light-text dark:text-dark-text flex-shrink-0"
                            >
                                {question.text}
                            </button>
                        {/each}
                    </div>
                    
                    <!-- Right scroll button -->
                    {#if showRightScroll}
                        <button 
                            on:click={scrollQuestionsRight}
                            class="flex-shrink-0 z-10 p-1.5 my-1.5 rounded-full bg-light-bg dark:bg-dark-bg hover:bg-light-hover dark:hover:bg-dark-hover transition-colors shadow-sm text-light-text dark:text-dark-text"
                            aria-label="Scroll right"
                            transition:fade={{ duration: 150 }}
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                <path d="m9 18 6-6-6-6"/>
                            </svg>
                        </button>
                    {/if}
                </div>
            </div>
            
            <!-- Input area with enhanced styling -->
            {#if !loading || messages.length > 0}
                <div class="relative w-full px-5 py-3 border-t border-light-border dark:border-dark-border bg-light-card dark:bg-dark-card">
                    <form on:submit|preventDefault={handleSubmit} class="flex items-end gap-2">
                        <div class="flex-1 relative">
                            <textarea
                                bind:value={userInput}
                                on:input={autoGrow}
                                on:keydown={handleKeyDown}
                                placeholder="Ask a follow-up question..."
                                class="w-full p-3 border rounded-lg resize-none min-h-[44px] max-h-[150px] bg-light-bg dark:bg-dark-bg border-light-border dark:border-dark-border focus:border-theme-500 focus:ring-1 focus:ring-theme-500 outline-none placeholder-light-text-muted dark:placeholder-dark-text-muted shadow-inner"
                                rows="1"
                            ></textarea>
                        </div>
                        
                        <button 
                            type="submit" 
                            disabled={loading || !userInput.trim()} 
                            class="px-4 py-2.5 rounded-lg bg-gradient-to-r from-theme-500 to-theme-600 text-white transition-colors hover:from-theme-600 hover:to-theme-700 disabled:opacity-50 disabled:cursor-not-allowed shadow-md hover:shadow-lg disabled:shadow-none"
                        >
                            {#if loading}
                                <span class="inline-block w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                            {:else}
                                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m22 2-7 20-4-9-9-4Z"/><path d="M22 2 11 13"/></svg>
                            {/if}
                        </button>
                    </form>
                </div>
            {/if}
            
            <!-- Disclaimer with enhanced styling -->
            <div class="text-xs text-center py-2.5 text-light-text-muted dark:text-dark-text-muted bg-light-hover/30 dark:bg-dark-hover/30 border-t border-light-border/20 dark:border-dark-border/20">
                <span class="flex items-center justify-center gap-1.5">
                    <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <circle cx="12" cy="12" r="10"></circle>
                        <line x1="12" y1="8" x2="12" y2="12"></line>
                        <line x1="12" y1="16" x2="12.01" y2="16"></line>
                    </svg>
                    AI responses may not always be accurate. Always verify important information.
                </span>
            </div>
        </div>
    </div>
</div>

<!-- Scroll to top button with enhanced styling -->
{#if show && !shouldAutoScroll}
<button 
    class="fixed bottom-24 right-6 bg-gradient-to-r from-theme-500 to-theme-600 hover:from-theme-600 hover:to-theme-700 text-white rounded-full p-3 shadow-lg hover:shadow-xl z-[201] transition-all duration-200"
    on:click={() => {
        if (chatBoxRef) {
            chatBoxRef.scrollTop = 0;
            shouldAutoScroll = false;
        }
    }}
    title="Scroll to top"
    transition:fade={{ duration: 200 }}
>
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="m18 15-6-6-6 6"/>
    </svg>
</button>
{/if}

<style lang="postcss">
    /* Card styling */
    .card {
        @apply bg-light-card dark:bg-dark-card border border-light-border/20 dark:border-dark-border/20 rounded-xl shadow-xl;
    }

    .input {
        @apply bg-light-bg dark:bg-dark-bg border border-light-border dark:border-dark-border;
    }
    
    /* Typing indicator animation */
    .typing-indicator {
        @apply flex items-center gap-1.5;
    }
    
    .typing-indicator span {
        @apply bg-theme-500/70 dark:bg-theme-500/90 h-2 w-2 rounded-full;
        animation: typing 1.3s infinite;
        display: inline-block;
    }
    
    .typing-indicator span:nth-child(2) {
        animation-delay: 0.2s;
    }
    
    .typing-indicator span:nth-child(3) {
        animation-delay: 0.4s;
    }
    
    @keyframes typing {
        0%, 60%, 100% {
            transform: translateY(0);
            opacity: 0.6;
        }
        30% {
            transform: translateY(-4px);
            opacity: 1;
        }
    }
    
    /* Enhanced prose styling for markdown */
    :global(.prose pre) {
        @apply bg-light-hover/70 dark:bg-dark-hover/70 rounded-md p-3 my-3 text-sm overflow-x-auto;
    }
    
    :global(.prose code) {
        @apply bg-light-hover/70 dark:bg-dark-hover/70 px-1.5 py-0.5 rounded text-xs;
    }
    
    :global(.prose h1) {
        @apply text-light-text dark:text-dark-text font-bold;
    }
    
    :global(.prose h2) {
        @apply text-light-text dark:text-dark-text font-bold;
    }
    
    :global(.prose h3) {
        @apply text-light-text dark:text-dark-text font-bold;
    }
    
    :global(.prose h1) {
        @apply text-xl border-b border-light-border/30 dark:border-dark-border/30 pb-2 mb-3;
    }
    
    :global(.prose h2) {
        @apply text-lg border-b border-light-border/20 dark:border-dark-border/20 pb-1.5 mb-2;
    }
    
    :global(.prose h3) {
        @apply text-base pb-1 mb-1.5;
    }
    
    :global(.prose p) {
        @apply my-2;
    }
    
    :global(.prose ul, .prose ol) {
        @apply pl-5 my-2;
    }
    
    :global(.prose li) {
        @apply my-1;
    }
    
    :global(.prose a) {
        @apply text-theme-500 hover:text-theme-600 dark:text-theme-400 dark:hover:text-theme-300;
    }
    
    :global(.prose blockquote) {
        @apply border-l-4 border-theme-500/30 pl-3 my-3 italic text-light-text-muted dark:text-dark-text-muted;
    }
    
    /* Hide scrollbar but allow scrolling */
    .no-scrollbar {
        -ms-overflow-style: none;  /* IE and Edge */
        scrollbar-width: none;  /* Firefox */
    }
    
    .no-scrollbar::-webkit-scrollbar {
        display: none;  /* Chrome, Safari and Opera */
    }
</style> 