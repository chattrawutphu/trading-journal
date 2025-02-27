<script>
    import { fade } from 'svelte/transition';
    import { formatCurrency, formatPercentage } from '$lib/utils/formatters';
    import { binanceExchange } from '$lib/exchanges';
    import { onMount } from 'svelte';
    
    export let show = false;
    export let trade = null;
    
    // Compute position history, supporting backward compatibility
    $: positionHistory = trade ? (trade.positionHistory || convertCloseHistoryToPositionHistory(trade.closeHistory)) : [];

    // Chart data and state
    let chartData = [];
    let chartLoading = false;
    let chartError = null;
    let chartContainer;
    let chart;
    
    // Chart interaction state
    let hoveredCandle = null;
    let hoveredMarker = null;
    let isDragging = false;
    let dragStart = { x: 0, y: 0 };
    let chartOffset = { x: 0, y: 0 };
    let chartScale = 1;
    let minScale = 0.5;
    let maxScale = 5;
    
    // Convert old closeHistory format to new positionHistory format
    function convertCloseHistoryToPositionHistory(closeHistory) {
        if (!closeHistory || !Array.isArray(closeHistory)) return [];
        
        return closeHistory.map(close => ({
            ...close,
            action: 'DECREASE' // Assume all closeHistory entries are decreases
        }));
    }
    
    function close() {
        show = false;
    }

    function formatDate(dateStr) {
        const options = { 
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        };
        return new Date(dateStr).toLocaleString(undefined, options);
    }

    function getDuration(entryDate, exitDate) {
        if (!entryDate || !exitDate) return '';
        const duration = new Date(exitDate) - new Date(entryDate);
        const days = Math.floor(duration / (1000 * 60 * 60 * 24));
        const hours = Math.floor((duration % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const minutes = Math.floor((duration % (1000 * 60 * 60)) / (1000 * 60));
        
        let result = [];
        if (days > 0) result.push(`${days}d`);
        if (hours > 0) result.push(`${hours}h`);
        if (minutes > 0) result.push(`${minutes}m`);
        return result.join(' ');
    }

    function getSideClass(side) {
        return side === 'LONG' ? 'text-green-500 bg-green-500/10' : 'text-red-500 bg-red-500/10';
    }

    function isImageUrl(url) {
        if (!url) return false;
        return url.match(/\.(jpeg|jpg|gif|png|webp)$/i) != null;
    }

    function handleImageError(event) {
        event.target.style.display = 'none';
    }

    function getTagColor(tag) {
        const colors = [
            { bg: 'bg-blue-500/10', text: 'text-blue-500' },
            { bg: 'bg-green-500/10', text: 'text-green-500' },
            { bg: 'bg-purple-500/10', text: 'text-purple-500' },
            { bg: 'bg-orange-500/10', text: 'text-orange-500' },
            { bg: 'bg-pink-500/10', text: 'text-pink-500' },
            { bg: 'bg-teal-500/10', text: 'text-teal-500' },
            { bg: 'bg-indigo-500/10', text: 'text-indigo-500' },
        ];
        
        const hash = tag.split('').reduce((acc, char) => {
            return char.charCodeAt(0) + ((acc << 5) - acc);
        }, 0);
        
        return colors[Math.abs(hash) % colors.length];
    }

    // Add unrealized PnL calculation
    $: if (trade && trade.status === 'OPEN' && trade.currentPrice) {
        trade.unrealizedPnL = binanceExchange.calculateUnrealizedPnL(trade, trade.currentPrice);
    }

    // Add debug log to check positionHistory data
    $: if (trade) {
        console.log('Trade data in modal:', trade);
        const hasPositionHistory = !!trade.positionHistory;
        const hasCloseHistory = !!trade.closeHistory;
        console.log('Has position history:', hasPositionHistory, 'Has close history:', hasCloseHistory);
        console.log('Using position history:', positionHistory);
    }

    // ฟังก์ชันสำหรับตรวจสอบว่า field มีข้อมูลหรือไม่
    function hasContent(value) {
        if (value === null || value === undefined) return false;
        if (typeof value === 'string') return value.trim() !== '';
        if (Array.isArray(value)) return value.length > 0;
        if (typeof value === 'object') return Object.keys(value).length > 0;
        return true;
    }

    // Function to determine the appropriate decimal precision for a symbol
    function getDecimalPrecision(symbol, price) {
        // First check if we can determine precision from the price itself
        if (price !== undefined && price !== null) {
            const priceStr = price.toString();
            const decimalPart = priceStr.includes('.') ? priceStr.split('.')[1] : '';
            
            // If price has decimals, find the last non-zero digit
            if (decimalPart) {
                // Find last non-zero digit position
                let lastNonZero = decimalPart.length;
                for (let i = decimalPart.length - 1; i >= 0; i--) {
                    if (decimalPart[i] !== '0') {
                        lastNonZero = i + 1;
                        break;
                    }
                }
                return Math.max(lastNonZero, 2); // At least 2 decimal places
            }
        }
        
        // Symbol-based precision as fallback
        if (symbol) {
            // Common precision patterns for different assets
            if (symbol.includes('BTC')) return 2;
            if (symbol.includes('ETH')) return 2;
            if (symbol.includes('BNB')) return 2;
            if (symbol.includes('USDT') || symbol.includes('BUSD') || symbol.includes('USDC')) return 3;
            if (symbol.includes('XRP') || symbol.includes('ADA') || symbol.includes('DOT')) return 4;
            if (symbol.includes('DOGE') || symbol.includes('SHIB')) return 8;
            
            // For pairs with USD or stablecoins as quote currency
            if (/USD[A-Z]?$/.test(symbol)) {
                // Check if price is very small (like < 0.1)
                if (price && price < 0.1) return 6;
                if (price && price < 1) return 5;
                if (price && price < 10) return 4;
                if (price && price < 100) return 3;
                if (price && price < 1000) return 2;
                return 2; // Default for USD pairs
            }
        }
        
        return 4; // Default precision
    }
    
    // Get the precision for the current trade
    $: pricePrecision = trade ? getDecimalPrecision(trade.symbol, trade.entryPrice) : 2;
    
    // Format price with appropriate precision
    function formatPrice(price) {
        if (price === undefined || price === null) return '';
        return price.toFixed(pricePrecision);
    }

    // Function to fetch historical price data for the chart
    async function fetchHistoricalData() {
        if (!trade || !trade.symbol) return;
        
        chartLoading = true;
        chartError = null;
        
        try {
            // Sort position history chronologically if it exists
            if (positionHistory && positionHistory.length > 0) {
                // Create a copy to avoid modifying the original array directly
                const sortedHistory = [...positionHistory].sort((a, b) => {
                    return new Date(a.date).getTime() - new Date(b.date).getTime();
                });
                
                // Calculate time range from earliest to latest position history entry
                const startTime = Math.min(new Date(sortedHistory[0].date).getTime(), new Date(trade.entryDate).getTime());
                const endTime = trade.exitDate 
                    ? Math.max(new Date(sortedHistory[sortedHistory.length - 1].date).getTime(), new Date(trade.exitDate).getTime())
                    : Math.max(new Date(sortedHistory[sortedHistory.length - 1].date).getTime(), Date.now());
                
                // Determine optimal interval based on trade duration
                const timeRange = endTime - startTime;
                const interval = getOptimalInterval(timeRange);
                
                // Calculate padding to ensure we have context around the entries
                const intervalMs = getIntervalInMs(interval);
                const paddingBefore = intervalMs * 30; // 30 candles before first entry
                const paddingAfter = intervalMs * 30;  // 30 candles after last entry
                
                const paddedStart = startTime - paddingBefore;
                const paddedEnd = endTime + paddingAfter;
                
                // Fetch candle data with appropriate limit to ensure all markers are visible
                const response = await fetch(
                    `https://fapi.binance.com/fapi/v1/klines?symbol=${trade.symbol}&interval=${interval}&startTime=${Math.floor(paddedStart)}&endTime=${Math.floor(paddedEnd)}&limit=500`
                );
                
                if (!response.ok) {
                    throw new Error('Failed to fetch chart data');
                }
                
                const data = await response.json();
                console.log(`Fetched ${data.length} candles for chart with interval ${interval}`);
                
                // If we got too many candles, try a larger interval
                if (data.length > 180) {
                    const largerInterval = getNextLargerInterval(interval);
                    console.log(`Too many candles (${data.length}), trying larger interval: ${largerInterval}`);
                    
                    const response2 = await fetch(
                        `https://fapi.binance.com/fapi/v1/klines?symbol=${trade.symbol}&interval=${largerInterval}&startTime=${Math.floor(paddedStart)}&endTime=${Math.floor(paddedEnd)}&limit=180`
                    );
                    
                    if (!response2.ok) {
                        throw new Error('Failed to fetch chart data with larger interval');
                    }
                    
                    const data2 = await response2.json();
                    console.log(`Fetched ${data2.length} candles with larger interval ${largerInterval}`);
                    
                    // Transform data for our chart
                    chartData = data2.map(candle => ({
                        time: candle[0], // Open time
                        open: parseFloat(candle[1]),
                        high: parseFloat(candle[2]),
                        low: parseFloat(candle[3]),
                        close: parseFloat(candle[4]),
                        volume: parseFloat(candle[5])
                    }));
                    
                    // Store the interval for display
                    currentInterval = largerInterval;
                } else {
                    // Transform data for our chart
                    chartData = data.map(candle => ({
                        time: candle[0], // Open time
                        open: parseFloat(candle[1]),
                        high: parseFloat(candle[2]),
                        low: parseFloat(candle[3]),
                        close: parseFloat(candle[4]),
                        volume: parseFloat(candle[5])
                    }));
                    
                    // Store the interval for display
                    currentInterval = interval;
                }
            } else {
                // Original logic for trades without position history
                // Calculate time range (entry date to exit date or current date)
                const startTime = new Date(trade.entryDate).getTime();
                const endTime = trade.exitDate 
                    ? new Date(trade.exitDate).getTime() 
                    : Date.now();
                
                // Determine optimal interval based on trade duration
                const timeRange = endTime - startTime;
                const interval = getOptimalInterval(timeRange);
                
                // Calculate how much time to add before and after
                const intervalMs = getIntervalInMs(interval);
                const paddingBefore = intervalMs * 30; // 30 candles before entry
                const paddingAfter = intervalMs * 30;  // 30 candles after exit
                
                const paddedStart = startTime - paddingBefore;
                const paddedEnd = endTime + paddingAfter;
                
                // Fetch candle data from Binance public API
                const response = await fetch(
                    `https://fapi.binance.com/fapi/v1/klines?symbol=${trade.symbol}&interval=${interval}&startTime=${Math.floor(paddedStart)}&endTime=${Math.floor(paddedEnd)}&limit=180`
                );
                
                if (!response.ok) {
                    throw new Error('Failed to fetch chart data');
                }
                
                const data = await response.json();
                console.log(`Fetched ${data.length} candles for chart`);
                
                // Transform data for our chart
                chartData = data.map(candle => ({
                    time: candle[0], // Open time
                    open: parseFloat(candle[1]),
                    high: parseFloat(candle[2]),
                    low: parseFloat(candle[3]),
                    close: parseFloat(candle[4]),
                    volume: parseFloat(candle[5])
                }));
                
                // Store the interval for display
                currentInterval = interval;
            }
            
            // Initialize chart after data is loaded
            if (chartData.length > 0) {
                initializeChart();
            }
        } catch (error) {
            console.error('Error fetching chart data:', error);
            chartError = error.message;
        } finally {
            chartLoading = false;
        }
    }
    
    // Helper function to get the next larger interval
    function getNextLargerInterval(interval) {
        const intervals = ['1m', '3m', '5m', '15m', '30m', '1h', '2h', '4h', '6h', '8h', '12h', '1d'];
        const currentIndex = intervals.indexOf(interval);
        
        if (currentIndex === -1 || currentIndex === intervals.length - 1) {
            return '1h'; // Default to 1h if current interval not found or already at largest
        }
        
        return intervals[currentIndex + 1];
    }
    
    // Determine optimal interval based on trade duration
    function getOptimalInterval(timeRange) {
        const hours = timeRange / (1000 * 60 * 60);
        
        if (hours <= 3) return '1m';
        if (hours <= 6) return '3m';
        if (hours <= 12) return '5m';
        if (hours <= 24) return '15m';
        if (hours <= 48) return '30m';
        if (hours <= 96) return '1h';
        if (hours <= 192) return '2h';
        if (hours <= 384) return '4h';
        if (hours <= 768) return '6h';
        if (hours <= 1152) return '8h';
        if (hours <= 1920) return '12h';
        return '1d';
    }
    
    // Helper function to convert interval string to milliseconds
    function getIntervalInMs(interval) {
        const value = parseInt(interval.slice(0, -1));
        const unit = interval.slice(-1);
        
        switch (unit) {
            case 'm': return value * 60 * 1000;
            case 'h': return value * 60 * 60 * 1000;
            case 'd': return value * 24 * 60 * 60 * 1000;
            case 'w': return value * 7 * 24 * 60 * 60 * 1000;
            default: return 60 * 1000; // default to 1m
        }
    }
    
    // Initialize and render the chart
    function initializeChart() {
        if (!chartContainer || chartData.length === 0) return;
        
        // Clear previous chart if exists
        if (chart) {
            chartContainer.innerHTML = '';
        }
        
        // Create canvas element with higher resolution for sharper rendering
        const canvas = document.createElement('canvas');
        const pixelRatio = window.devicePixelRatio || 1;
        canvas.width = chartContainer.clientWidth * pixelRatio;
        canvas.height = 300 * pixelRatio;
        canvas.style.width = `${chartContainer.clientWidth}px`;
        canvas.style.height = '300px';
        chartContainer.appendChild(canvas);
        
        const ctx = canvas.getContext('2d');
        ctx.scale(pixelRatio, pixelRatio); // Scale for high DPI displays
        
        // Set up chart dimensions
        const chartWidth = chartContainer.clientWidth;
        const chartHeight = 300;
        const padding = { top: 30, right: 60, bottom: 40, left: 60 };
        const plotWidth = chartWidth - padding.left - padding.right;
        const plotHeight = chartHeight - padding.top - padding.bottom;
        
        // Find min/max values for scaling with more padding for better visibility
        const prices = chartData.flatMap(d => [d.high, d.low]);
        if (trade.entryPrice) prices.push(trade.entryPrice);
        if (trade.exitPrice) prices.push(trade.exitPrice);
        if (trade.stopLoss) prices.push(trade.stopLoss);
        if (trade.takeProfit) prices.push(trade.takeProfit);
        
        const minPrice = Math.min(...prices) * 0.995; // More padding at bottom
        const maxPrice = Math.max(...prices) * 1.005; // More padding at top
        const priceRange = maxPrice - minPrice;
        
        // Scale functions
        const timeToX = (time) => {
            const minTime = chartData[0].time;
            const maxTime = chartData[chartData.length - 1].time;
            const timeRange = maxTime - minTime;
            
            // คำนวณตำแหน่ง X โดยคำนึงถึง scale และ offset
            const normalX = ((time - minTime) / timeRange) * plotWidth;
            return padding.left + normalX * chartScale + chartOffset.x;
        };
        
        const priceToY = (price) => {
            // คำนวณตำแหน่ง Y โดยคำนึงถึง scale และ offset
            const normalY = ((price - minPrice) / priceRange) * plotHeight;
            return padding.top + (plotHeight - normalY) * chartScale + chartOffset.y;
        };
        
        // Draw background
        const isDarkMode = document.documentElement.classList.contains('dark');
        ctx.fillStyle = isDarkMode ? '#121224' : '#f8fafc'; // Darker background in dark mode
        ctx.fillRect(0, 0, chartWidth, chartHeight);
        
        // Draw grid with more visible lines
        ctx.strokeStyle = isDarkMode ? 'rgba(255, 255, 255, 0.15)' : 'rgba(0, 0, 0, 0.15)';
        ctx.lineWidth = 0.75; // Slightly thicker grid lines
        
        // Horizontal grid lines (price levels)
        const priceStep = priceRange / 5;
        for (let i = 0; i <= 5; i++) {
            const price = minPrice + (i * priceStep);
            const y = priceToY(price);
            
            ctx.beginPath();
            ctx.moveTo(padding.left, y);
            ctx.lineTo(chartWidth - padding.right, y);
            ctx.stroke();
            
            // Price labels with proper precision and better visibility
            ctx.fillStyle = isDarkMode ? 'rgba(255, 255, 255, 0.9)' : 'rgba(0, 0, 0, 0.9)';
            ctx.font = 'bold 10px sans-serif';
            ctx.textAlign = 'right';
            ctx.fillText(formatPrice(price), chartWidth - padding.right + 5, y + 4);
        }
        
        // Draw volume bars at the bottom with better visibility
        const volumeHeight = plotHeight * 0.15;
        const volumeBottom = padding.top + plotHeight;
        const maxVolume = Math.max(...chartData.map(d => d.volume));
        
        chartData.forEach((d, i) => {
            const x = timeToX(d.time);
            const candleWidth = Math.max(plotWidth / chartData.length - 1, 1) * chartScale;
            
            // Skip if outside visible area
            if (x < padding.left - candleWidth || x > chartWidth - padding.right + candleWidth) return;
            
            // Volume bar with higher opacity
            const volumeHeight = (d.volume / maxVolume) * (plotHeight * 0.15);
            const isGreen = d.close >= d.open;
            
            ctx.fillStyle = isGreen ? 'rgba(0, 200, 0, 0.5)' : 'rgba(255, 0, 0, 0.5)';
            ctx.fillRect(
                x - candleWidth/2, 
                padding.top + plotHeight - volumeHeight, 
                candleWidth, 
                volumeHeight
            );
        });
        
        // Draw candles with more vibrant colors and thicker wicks
        chartData.forEach((d, i) => {
            const x = timeToX(d.time);
            const candleWidth = Math.max(plotWidth / chartData.length - 1, 1) * chartScale;
            
            // Skip if outside visible area
            if (x < padding.left - candleWidth || x > chartWidth - padding.right + candleWidth) return;
            
            // Body
            const openY = priceToY(d.open);
            const closeY = priceToY(d.close);
            const isGreen = d.close >= d.open;
            
            // Highlight hovered candle with more visible highlight
            if (hoveredCandle === i) {
                // ใช้สีที่เหมาะสมกับ theme แทนสีน้ำตาล
                ctx.fillStyle = isDarkMode ? 'rgba(100, 116, 139, 0.2)' : 'rgba(226, 232, 240, 0.6)';
                
                // วาดเฉพาะแท่งเทียนที่ hover แทนการวาดทั้งแนวนอน
                ctx.fillRect(
                    x - candleWidth - 2, 
                    Math.min(priceToY(d.high), priceToY(d.low)) - 5, 
                    candleWidth * 2 + 4, 
                    Math.abs(priceToY(d.high) - priceToY(d.low)) + 10
                );
                
                // แสดงเฉพาะราคาปัจจุบันแทนกล่อง OHLC
                const closeY = priceToY(d.close);
                
                // วาดเส้นราคาปัจจุบัน
                ctx.strokeStyle = isGreen ? 'rgba(0, 220, 0, 0.8)' : 'rgba(255, 0, 0, 0.8)';
                ctx.lineWidth = 1;
                ctx.setLineDash([2, 2]);
                ctx.beginPath();
                ctx.moveTo(padding.left, closeY);
                ctx.lineTo(chartWidth - padding.right, closeY);
                ctx.stroke();
                ctx.setLineDash([]);
                
                // แสดงราคาปัจจุบันที่ด้านขวา
                ctx.fillStyle = isGreen ? 'rgba(0, 220, 0, 1.0)' : 'rgba(255, 0, 0, 1.0)';
                ctx.font = 'bold 11px sans-serif';
                ctx.textAlign = 'right';
                ctx.fillText(`${formatPrice(d.close)}`, chartWidth - padding.right - 5, closeY - 5);
                
                // แสดงวันที่ด้านบน
                const date = new Date(d.time);
                ctx.fillStyle = isDarkMode ? 'rgba(255, 255, 255, 0.9)' : 'rgba(0, 0, 0, 0.9)';
                ctx.font = 'bold 10px sans-serif';
                ctx.textAlign = 'center';
                ctx.fillText(date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}), x, padding.top - 5);
            }
            
            // Draw candle body with more vibrant colors
            ctx.fillStyle = isGreen ? 'rgba(0, 220, 0, 1.0)' : 'rgba(255, 0, 0, 1.0)';
            ctx.fillRect(x - candleWidth/2, Math.min(openY, closeY), candleWidth, Math.abs(closeY - openY) || 1);
            
            // Wicks with thicker lines
            ctx.strokeStyle = isGreen ? 'rgba(0, 220, 0, 1.0)' : 'rgba(255, 0, 0, 1.0)';
            ctx.lineWidth = 1.5;
            ctx.beginPath();
            ctx.moveTo(x, priceToY(d.high));
            ctx.lineTo(x, Math.min(openY, closeY));
            ctx.moveTo(x, Math.max(openY, closeY));
            ctx.lineTo(x, priceToY(d.low));
            ctx.stroke();
            
            // Time labels (show only a few) with better visibility
            if (i % Math.ceil(chartData.length / 5) === 0) {
                const date = new Date(d.time);
                ctx.fillStyle = isDarkMode ? 'rgba(255, 255, 255, 0.9)' : 'rgba(0, 0, 0, 0.9)';
                ctx.font = 'bold 10px sans-serif';
                ctx.textAlign = 'center';
                ctx.fillText(date.toLocaleDateString(), x, chartHeight - padding.bottom + 15);
            }
        });
        
        // Draw stop loss and take profit lines with more visibility
        if (trade.stopLoss) {
            const slY = priceToY(trade.stopLoss);
            
            ctx.strokeStyle = 'rgba(255, 0, 0, 0.8)'; // More visible red
            ctx.lineWidth = 1.5; // Thicker line
            ctx.setLineDash([5, 3]);
            ctx.beginPath();
            ctx.moveTo(padding.left, slY);
            ctx.lineTo(chartWidth - padding.right, slY);
            ctx.stroke();
            
            // SL label with better visibility
            ctx.fillStyle = 'rgba(255, 0, 0, 1.0)';
            ctx.font = 'bold 11px sans-serif';
            ctx.textAlign = 'left';
            ctx.fillText(`SL: ${formatPrice(trade.stopLoss)}`, padding.left + 5, slY - 5);
        }
        
        if (trade.takeProfit) {
            const tpY = priceToY(trade.takeProfit);
            
            ctx.strokeStyle = 'rgba(0, 255, 0, 0.8)'; // More visible green
            ctx.lineWidth = 1.5; // Thicker line
            ctx.setLineDash([5, 3]);
            ctx.beginPath();
            ctx.moveTo(padding.left, tpY);
            ctx.lineTo(chartWidth - padding.right, tpY);
            ctx.stroke();
            
            // TP label with better visibility
            ctx.fillStyle = 'rgba(0, 255, 0, 1.0)';
            ctx.font = 'bold 11px sans-serif';
            ctx.textAlign = 'left';
            ctx.fillText(`TP: ${formatPrice(trade.takeProfit)}`, padding.left + 5, tpY - 5);
        }
        
        // Draw position history markers with more visibility
        if (positionHistory && positionHistory.length > 0) {
            // Remove connecting lines between markers - we're not drawing them anymore
            
            // Sort position history by date for consistent ordering
            const sortedPositionHistory = [...positionHistory].sort((a, b) => new Date(a.date) - new Date(b.date));
            
            // First pass: identify markers that are too close to each other
            const markerPositions = [];
            sortedPositionHistory.forEach((entry, index) => {
                const entryTime = new Date(entry.date).getTime();
                
                // Find closest candle to marker time
                const closestCandleIdx = chartData.findIndex(d => d.time >= entryTime);
                if (closestCandleIdx === -1) return;
                
                const x = timeToX(chartData[closestCandleIdx].time);
                const y = priceToY(entry.price);
                
                markerPositions.push({ x, y, index, entry });
            });
            
            // Group markers that are close to each other horizontally
            const markerGroups = [];
            const proximityThreshold = 30; // pixels
            
            markerPositions.forEach(marker => {
                // Find an existing group that this marker is close to
                const existingGroup = markerGroups.find(group => {
                    return Math.abs(group[0].x - marker.x) < proximityThreshold;
                });
                
                if (existingGroup) {
                    existingGroup.push(marker);
                } else {
                    markerGroups.push([marker]);
                }
            });
            
            // Second pass: draw markers with vertical offset for overlapping ones
            markerGroups.forEach(group => {
                // Sort group by date (oldest first)
                group.sort((a, b) => new Date(a.entry.date) - new Date(b.entry.date));
                
                // First draw all markers
                group.forEach((marker, groupIndex) => {
                    const { x, y, index, entry } = marker;
                    
                    // Skip drawing this marker if it's the hovered one - we'll draw it last
                    if (hoveredMarker === index) return;
                    
                    // Apply vertical offset for stacked markers (move up)
                    const verticalOffset = groupIndex * -30; // 30px offset per marker in group
                    const adjustedY = y + verticalOffset;
                    
                    const isIncrease = entry.action === 'INCREASE';
                    // Add fallback for undefined pnl values
                    const isProfitable = isIncrease ? true : (entry.pnl !== undefined ? entry.pnl >= 0 : false);
                    
                    // Draw marker with larger size and higher z-index
                    // First draw a shadow/glow effect
                    ctx.beginPath();
                    ctx.fillStyle = isIncrease 
                        ? 'rgba(52, 152, 219, 0.3)' 
                        : (isProfitable ? 'rgba(46, 204, 113, 0.3)' : 'rgba(231, 76, 60, 0.3)');
                    ctx.arc(x, adjustedY, 14, 0, Math.PI * 2);
                    ctx.fill();
                    
                    // Draw marker background
                    ctx.beginPath();
                    ctx.fillStyle = isIncrease 
                        ? 'rgba(52, 152, 219, 0.9)' 
                        : (isProfitable ? 'rgba(46, 204, 113, 0.9)' : 'rgba(231, 76, 60, 0.9)');
                    ctx.arc(x, adjustedY, 12, 0, Math.PI * 2);
                    ctx.fill();
                    
                    // Draw marker border
                    ctx.beginPath();
                    ctx.strokeStyle = isIncrease 
                        ? 'rgb(52, 152, 219)' 
                        : (isProfitable ? 'rgb(46, 204, 113)' : 'rgb(231, 76, 60)');
                    ctx.lineWidth = 2;
                    ctx.arc(x, adjustedY, 12, 0, Math.PI * 2);
                    ctx.stroke();
                    
                    // Draw marker number
                    ctx.fillStyle = '#fff';
                    ctx.font = 'bold 12px sans-serif';
                    ctx.textAlign = 'center';
                    ctx.textBaseline = 'middle';
                    ctx.fillText(index + 1, x, adjustedY);
                    
                    // If this is not the first marker in a group, draw a dotted line to the price level
                    if (groupIndex > 0) {
                        ctx.beginPath();
                        ctx.strokeStyle = isIncrease 
                            ? 'rgba(52, 152, 219, 0.5)' 
                            : (isProfitable ? 'rgba(46, 204, 113, 0.5)' : 'rgba(231, 76, 60, 0.5)');
                        ctx.setLineDash([2, 2]);
                        ctx.moveTo(x, adjustedY);
                        ctx.lineTo(x, y);
                        ctx.stroke();
                        ctx.setLineDash([]);
                    }
                });
                
                // Draw the hovered marker and its tooltip last (on top of everything)
                group.forEach((marker, groupIndex) => {
                    const { x, y, index, entry } = marker;
                    
                    // Only process the hovered marker
                    if (hoveredMarker !== index) return;
                    
                    // Apply vertical offset for stacked markers (move up)
                    const verticalOffset = groupIndex * -30; // 30px offset per marker in group
                    const adjustedY = y + verticalOffset;
                    
                    const isIncrease = entry.action === 'INCREASE';
                    const isProfitable = isIncrease ? true : (entry.pnl !== undefined ? entry.pnl >= 0 : false);
                    
                    // Draw hovered marker with larger size and glow effect
                    // First draw a larger glow effect
                    ctx.beginPath();
                    ctx.fillStyle = isIncrease 
                        ? 'rgba(52, 152, 219, 0.4)' 
                        : (isProfitable ? 'rgba(46, 204, 113, 0.4)' : 'rgba(231, 76, 60, 0.4)');
                    ctx.arc(x, adjustedY, 16, 0, Math.PI * 2);
                    ctx.fill();
                    
                    // Draw marker background
                    ctx.beginPath();
                    ctx.fillStyle = isIncrease 
                        ? 'rgba(52, 152, 219, 1.0)' 
                        : (isProfitable ? 'rgba(46, 204, 113, 1.0)' : 'rgba(231, 76, 60, 1.0)');
                    ctx.arc(x, adjustedY, 12, 0, Math.PI * 2);
                    ctx.fill();
                    
                    // Draw marker border
                    ctx.beginPath();
                    ctx.strokeStyle = '#ffffff';
                    ctx.lineWidth = 2;
                    ctx.arc(x, adjustedY, 12, 0, Math.PI * 2);
                    ctx.stroke();
                    
                    // Draw marker number
                    ctx.fillStyle = '#fff';
                    ctx.font = 'bold 12px sans-serif';
                    ctx.textAlign = 'center';
                    ctx.textBaseline = 'middle';
                    ctx.fillText(index + 1, x, adjustedY);
                    
                    // If this is not the first marker in a group, draw a dotted line to the price level
                    if (groupIndex > 0) {
                        ctx.beginPath();
                        ctx.strokeStyle = isIncrease 
                            ? 'rgba(52, 152, 219, 0.7)' 
                            : (isProfitable ? 'rgba(46, 204, 113, 0.7)' : 'rgba(231, 76, 60, 0.7)');
                        ctx.setLineDash([2, 2]);
                        ctx.moveTo(x, adjustedY);
                        ctx.lineTo(x, y);
                        ctx.stroke();
                        ctx.setLineDash([]);
                    }
                    
                    // Draw tooltip for hovered marker
                    const tooltipWidth = 150;
                    const tooltipHeight = entry.pnl !== undefined ? 90 : 70;
                    
                    // คำนวณตำแหน่งของ tooltip ให้อยู่ด้านล่างซ้ายของ marker
                    let tooltipX = x - 10;
                    let tooltipY = adjustedY + 15;
                    
                    // ตรวจสอบว่า tooltip จะล้นออกนอกกราฟหรือไม่
                    // ถ้าล้นทางขวา ให้ย้ายไปทางซ้ายของ marker แทน
                    if (tooltipX + tooltipWidth > chartWidth - padding.right) {
                        tooltipX = x - tooltipWidth + 10;
                    }
                    
                    // ถ้าล้นทางล่าง ให้ย้ายไปด้านบนของ marker แทน
                    if (tooltipY + tooltipHeight > chartHeight - padding.bottom) {
                        tooltipY = adjustedY - tooltipHeight - 15;
                    }
                    
                    // ตรวจสอบว่าไม่ล้นออกนอกกราฟทางซ้ายหรือด้านบน
                    tooltipX = Math.max(tooltipX, padding.left);
                    tooltipY = Math.max(tooltipY, padding.top);
                    
                    // วาดพื้นหลังของ tooltip ด้วยสีดำโปร่งใส
                    ctx.fillStyle = 'rgba(0, 0, 0, 0.85)';
                    ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
                    ctx.lineWidth = 1;
                    
                    // วาดกรอบโค้งมนพร้อมเงา
                    ctx.beginPath();
                    ctx.roundRect(tooltipX, tooltipY, tooltipWidth, tooltipHeight, 5);
                    ctx.fill();
                    ctx.stroke();
                    
                    // วาดเส้นเชื่อมจาก marker มาที่ tooltip
                    ctx.beginPath();
                    ctx.moveTo(x, adjustedY);
                    ctx.lineTo(tooltipX + 10, tooltipY);
                    ctx.stroke();
                    
                    // เพิ่มหัวข้อ tooltip
                    ctx.fillStyle = isIncrease ? '#3498db' : (isProfitable ? '#2ecc71' : '#e74c3c');
                    ctx.font = 'bold 11px sans-serif';
                    ctx.textAlign = 'left';
                    ctx.textBaseline = 'top';
                    ctx.fillText(`${entry.action}`, tooltipX + 8, tooltipY + 8);
                    
                    // เพิ่มเส้นคั่นหัวข้อ
                    ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
                    ctx.beginPath();
                    ctx.moveTo(tooltipX + 8, tooltipY + 25);
                    ctx.lineTo(tooltipX + tooltipWidth - 8, tooltipY + 25);
                    ctx.stroke();
                    
                    // เพิ่มเนื้อหา tooltip
                    ctx.fillStyle = '#fff';
                    ctx.font = '10px sans-serif';
                    
                    const date = new Date(entry.date);
                    ctx.fillText(date.toLocaleString(), tooltipX + 8, tooltipY + 30);
                    ctx.fillText(`Price: ${formatPrice(entry.price)}`, tooltipX + 8, tooltipY + 45);
                    ctx.fillText(`Qty: ${entry.quantity.toFixed(4)}`, tooltipX + 8, tooltipY + 60);
                    
                    if (entry.pnl !== undefined) {
                        const pnlColor = entry.pnl >= 0 ? '#2ecc71' : '#e74c3c';
                        ctx.fillStyle = pnlColor;
                        ctx.fillText(`PnL: ${formatCurrency(entry.pnl)}`, tooltipX + 8, tooltipY + 75);
                    }
                });
            });
        }
        
        // Remove entry and exit lines - we're not drawing them anymore
        
        // Draw chart info and controls with better visibility
        ctx.fillStyle = isDarkMode ? 'rgba(255, 255, 255, 1.0)' : 'rgba(0, 0, 0, 1.0)';
        ctx.font = 'bold 14px sans-serif';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'top';
        
        // Display symbol and timeframe
        const timeframeText = formatTimeframe(currentInterval);
        ctx.fillText(`${trade.symbol} - ${timeframeText}`, padding.left, 5);
        
        // Instructions
        ctx.fillStyle = isDarkMode ? 'rgba(255, 255, 255, 0.7)' : 'rgba(0, 0, 0, 0.7)';
        ctx.font = 'bold 10px sans-serif';
        ctx.textAlign = 'right';
        ctx.fillText('Hover for details', chartWidth - padding.right, 5);
        
        // Store chart reference
        chart = { 
            canvas, 
            ctx,
            padding,
            plotWidth,
            plotHeight,
            timeToX,
            priceToY,
            minTime: chartData[0].time,
            maxTime: chartData[chartData.length - 1].time,
            minPrice,
            maxPrice
        };
        
        // Add event listeners for interactivity
        canvas.addEventListener('mousemove', handleChartMouseMove);
        canvas.addEventListener('mouseleave', handleChartMouseLeave);
        
        // เพิ่ม event listeners หลังจากสร้างกราฟ
        setupChartEventListeners();
    }
    
    // Format timeframe for display
    function formatTimeframe(interval) {
        const value = interval.slice(0, -1);
        const unit = interval.slice(-1);
        
        switch (unit) {
            case 'm': return value === '1' ? '1 Minute' : `${value} Minutes`;
            case 'h': return value === '1' ? '1 Hour' : `${value} Hours`;
            case 'd': return value === '1' ? '1 Day' : `${value} Days`;
            case 'w': return value === '1' ? '1 Week' : `${value} Weeks`;
            default: return interval;
        }
    }
    
    // Handle mouse movement over chart
    function handleChartMouseMove(e) {
        if (!chart || !chartData.length) return;
        
        const rect = e.target.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        
        // Check if mouse is over a candle
        const { padding, plotWidth } = chart;
        
        if (x >= padding.left && x <= chart.canvas.width - padding.right &&
            y >= padding.top && y <= chart.canvas.height - padding.bottom) {
            
            // Find closest candle to cursor position
            let closestCandle = null;
            let minDistance = Infinity;
            
            for (let i = 0; i < chartData.length; i++) {
                const candleX = chart.timeToX(chartData[i].time);
                const distance = Math.abs(x - candleX);
                
                if (distance < minDistance) {
                    minDistance = distance;
                    closestCandle = i;
                }
            }
            
            // Only highlight if cursor is reasonably close to a candle (within 20px)
            if (minDistance <= 20) {
                hoveredCandle = closestCandle;
            } else {
                hoveredCandle = null;
            }
            
            // Check if mouse is over a marker
            hoveredMarker = null;
            
            if (positionHistory && positionHistory.length > 0) {
                // Sort position history by date for consistent ordering
                const sortedPositionHistory = [...positionHistory].sort((a, b) => new Date(a.date) - new Date(b.date));
                
                // Calculate marker positions
                const markerPositions = [];
                sortedPositionHistory.forEach((entry, index) => {
                    const entryTime = new Date(entry.date).getTime();
                    
                    // Find closest candle to marker time
                    const closestCandleIdx = chartData.findIndex(d => d.time >= entryTime);
                    if (closestCandleIdx === -1) return;
                    
                    const markerX = chart.timeToX(chartData[closestCandleIdx].time);
                    const markerY = chart.priceToY(entry.price);
                    
                    markerPositions.push({ x: markerX, y: markerY, index, entry });
                });
                
                // Group markers that are close to each other horizontally
                const markerGroups = [];
                const proximityThreshold = 30; // pixels
                
                markerPositions.forEach(marker => {
                    // Find an existing group that this marker is close to
                    const existingGroup = markerGroups.find(group => {
                        return Math.abs(group[0].x - marker.x) < proximityThreshold;
                    });
                    
                    if (existingGroup) {
                        existingGroup.push(marker);
                    } else {
                        markerGroups.push([marker]);
                    }
                });
                
                // Check if mouse is over any marker
                markerGroups.forEach(group => {
                    // Sort group by date (oldest first)
                    group.sort((a, b) => new Date(a.entry.date) - new Date(b.entry.date));
                    
                    // Check each marker in the group
                    group.forEach((marker, groupIndex) => {
                        const { x: markerX, y: markerY, index } = marker;
                        
                        // Apply vertical offset for stacked markers
                        const verticalOffset = groupIndex * -30; // 30px offset per marker in group
                        const adjustedY = markerY + verticalOffset;
                        
                        // Calculate distance from cursor to marker center
                        const distance = Math.sqrt(Math.pow(x - markerX, 2) + Math.pow(y - adjustedY, 2));
                        
                        // If cursor is within marker radius (12px), set as hovered
                        if (distance <= 12) {
                            hoveredMarker = index;
                        }
                    });
                });
            }
            
            // Redraw chart with hover effects
            initializeChart();
        }
    }
    
    // Handle mouse leaving chart
    function handleChartMouseLeave() {
        hoveredCandle = null;
        hoveredMarker = null;
        initializeChart();
    }
    
    // เพิ่มฟังก์ชันสำหรับจัดการการซูม
    function handleWheel(e) {
        e.preventDefault();
        
        // กำหนดจุดศูนย์กลางของการซูม (ตำแหน่งของเมาส์)
        const rect = e.target.getBoundingClientRect();
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;
        
        // คำนวณ scale ใหม่
        const oldScale = chartScale;
        const zoomFactor = e.deltaY > 0 ? 0.9 : 1.1; // ซูมเข้าหรือออก
        const newScale = Math.max(minScale, Math.min(maxScale, chartScale * zoomFactor));
        
        // ปรับ offset เพื่อให้การซูมมีจุดศูนย์กลางที่ตำแหน่งของเมาส์
        if (newScale !== oldScale) {
            const scaleRatio = newScale / oldScale;
            
            // ปรับ offset ตามการเปลี่ยนแปลงของ scale
            chartOffset.x = mouseX - (mouseX - chartOffset.x) * scaleRatio;
            chartOffset.y = mouseY - (mouseY - chartOffset.y) * scaleRatio;
            
            // อัปเดต scale
            chartScale = newScale;
            
            // วาดกราฟใหม่
            initializeChart();
        }
    }
    
    // เพิ่มฟังก์ชันสำหรับการลากเพื่อเลื่อนกราฟ
    function handleMouseDown(e) {
        isDragging = true;
        dragStart = { x: e.clientX, y: e.clientY };
    }
    
    function handleMouseMove(e) {
        if (isDragging) {
            const dx = e.clientX - dragStart.x;
            const dy = e.clientY - dragStart.y;
            
            chartOffset.x += dx;
            chartOffset.y += dy;
            
            dragStart = { x: e.clientX, y: e.clientY };
            
            // วาดกราฟใหม่
            initializeChart();
        } else {
            // ... existing hover detection code ...
        }
    }
    
    function handleMouseUp() {
        isDragging = false;
    }
    
    function handleMouseLeave() {
        isDragging = false;
        hoveredCandle = null;
        hoveredMarker = null;
        
        // วาดกราฟใหม่
        initializeChart();
    }
    
    // ฟังก์ชันสำหรับปุ่มควบคุมการซูม
    function zoomIn() {
        const oldScale = chartScale;
        const newScale = Math.min(maxScale, chartScale * 1.2);
        
        if (newScale !== oldScale) {
            // ซูมโดยมีจุดศูนย์กลางที่กลางกราฟ
            const centerX = chartContainer.clientWidth / 2;
            const centerY = chartContainer.clientHeight / 2;
            
            const scaleRatio = newScale / oldScale;
            chartOffset.x = centerX - (centerX - chartOffset.x) * scaleRatio;
            chartOffset.y = centerY - (centerY - chartOffset.y) * scaleRatio;
            
            chartScale = newScale;
            initializeChart();
        }
    }
    
    function zoomOut() {
        const oldScale = chartScale;
        const newScale = Math.max(minScale, chartScale / 1.2);
        
        if (newScale !== oldScale) {
            // ซูมโดยมีจุดศูนย์กลางที่กลางกราฟ
            const centerX = chartContainer.clientWidth / 2;
            const centerY = chartContainer.clientHeight / 2;
            
            const scaleRatio = newScale / oldScale;
            chartOffset.x = centerX - (centerX - chartOffset.x) * scaleRatio;
            chartOffset.y = centerY - (centerY - chartOffset.y) * scaleRatio;
            
            chartScale = newScale;
            initializeChart();
        }
    }
    
    function resetZoom() {
        chartScale = 1;
        chartOffset = { x: 0, y: 0 };
        initializeChart();
    }
    
    // เพิ่ม event listeners เมื่อ component ถูกโหลด
    onMount(() => {
        if (show && trade) {
            fetchHistoricalData();
        }
        
        return () => {
            // ลบ event listeners เมื่อ component ถูกทำลาย
            const canvas = chartContainer?.querySelector('canvas');
            if (canvas) {
                canvas.removeEventListener('wheel', handleWheel);
                canvas.removeEventListener('mousedown', handleMouseDown);
                canvas.removeEventListener('mousemove', handleMouseMove);
                canvas.removeEventListener('mouseup', handleMouseUp);
                canvas.removeEventListener('mouseleave', handleMouseLeave);
            }
        };
    });
    
    // เพิ่ม event listeners เมื่อกราฟถูกสร้าง
    function setupChartEventListeners() {
        const canvas = chartContainer?.querySelector('canvas');
        if (canvas) {
            canvas.addEventListener('wheel', handleWheel, { passive: false });
            canvas.addEventListener('mousedown', handleMouseDown);
            canvas.addEventListener('mousemove', handleMouseMove);
            canvas.addEventListener('mouseup', handleMouseUp);
            canvas.addEventListener('mouseleave', handleMouseLeave);
        }
    }
    
    // Watch for trade changes to update chart
    $: if (show && trade) {
        // Wait for DOM to be ready
        setTimeout(() => {
            fetchHistoricalData();
        }, 100);
    }
    
    // Handle window resize
    function handleResize() {
        if (chartContainer && chart) {
            chart.canvas.width = chartContainer.clientWidth;
            initializeChart();
        }
    }

    onMount(() => {
        window.addEventListener('resize', handleResize);
        return () => {
            window.removeEventListener('resize', handleResize);
        };
    });

    // Add variable to store current interval
    let currentInterval = '1m';
</script>

{#if show && trade}
<div 
    class="fixed inset-0 bg-black/50 z-[100] flex items-center justify-center p-4"
    transition:fade={{ duration: 150 }}
    on:click|self={close}
>
    <div class="w-full max-w-3xl bg-light-card dark:bg-dark-card rounded-xl shadow-xl overflow-hidden">
        <!-- Header -->
        <div class="relative px-6 py-4 bg-theme-500/10 border-b border-light-border dark:border-dark-border">
            <div class="flex items-center gap-3">
                <!-- Symbol, Type & Side -->
                <div class="flex-1 flex items-center gap-3">
                    <!-- Trade Type Icon -->
                    {#if trade.type === 'SYNC'}
                        <span class="text-theme-500" title="Synced trade">
                            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
                                    d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                            </svg>
                        </span>
                    {:else}
                        <span class="text-theme-500" title="Manual trade">
                            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
                                    d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                        </span>
                    {/if}

                    <div class="flex flex-col">
                        <div class="flex items-center gap-2">
                            <h2 class="text-xl font-bold text-light-text dark:text-dark-text">
                                {trade.symbol}
                            </h2>
                            <!-- Status Badge -->
                            <span class="px-2 py-0.5 rounded-full text-xs font-medium
                                {trade.status === 'OPEN' ? 'bg-yellow-500/10 text-yellow-500' : 'bg-theme-500/10 text-theme-500'}">
                                {trade.status}
                            </span>
                            <!-- Side Badge -->
                            <span class="px-2 py-0.5 rounded-full text-sm font-bold relative
                                {trade.side === 'LONG' ? 'bg-green-500/10 text-green-500' : 'bg-red-500/10 text-red-500'}">
                                {trade.side}
                                {#if trade.status === 'OPEN'}
                                    <div class="absolute inset-0 rounded-full animate-ping 
                                        {trade.side === 'LONG' ? 'bg-green-500/10' : 'bg-red-500/10'}">
                                    </div>
                                {/if}
                            </span>
                            {#if trade.favorite}
                                <svg class="w-5 h-5 text-yellow-500" fill="currentColor" viewBox="0 0 20 20">
                                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"/>
                                </svg>
                            {/if}
                        </div>
                        <div class="flex items-center gap-2 text-sm text-light-text-muted dark:text-dark-text-muted">
                            <span>{formatDate(trade.entryDate)}</span>
                            {#if trade.exitDate}
                                <span>•</span>
                                <span>{getDuration(trade.entryDate, trade.exitDate)}</span>
                            {/if}
                        </div>
                    </div>
                </div>

                <!-- P&L Display -->
                <div class="text-right flex items-center gap-4 justify-end">
                    {#if trade.status === 'OPEN'}
                        <!-- Current Price -->
                        {#if trade.currentPrice}
                            <div class="flex flex-col items-end">
                                <div class="text-sm text-light-text-muted dark:text-dark-text-muted">
                                    Current Price
                                </div>
                                <div class="text-lg font-bold text-light-text dark:text-dark-text">
                                    {formatCurrency(trade.currentPrice)}
                                </div>
                            </div>
                        {/if}
                        <!-- Unrealized P&L -->
                        <div class="flex flex-col items-end">
                            <div class="text-sm text-light-text-muted dark:text-dark-text-muted">
                                Unrealized P&L
                            </div>
                            <div class="text-xl font-bold text-yellow-500">
                                {#if trade.unrealizedPnL !== undefined}
                                    {formatCurrency(trade.unrealizedPnL)}
                                    <span class="text-sm text-yellow-500/70">
                                        ({formatPercentage((trade.unrealizedPnL / trade.amount) * 100)})
                                    </span>
                                {:else}
                                    Loading...
                                {/if}
                            </div>
                        </div>
                    {:else}
                        <!-- Closed P&L -->
                        <div class="flex flex-col items-end">
                            <div class="text-sm text-light-text-muted dark:text-dark-text-muted">
                                Realized P&L
                            </div>
                            <div class="text-xl font-bold {trade.pnl >= 0 ? 'text-green-500' : 'text-red-500'}">
                                {formatCurrency(trade.pnl)}
                                <span class="text-sm {trade.pnl >= 0 ? 'text-green-500/70' : 'text-red-500/70'}">
                                    ({formatPercentage((trade.pnl / trade.amount) * 100)})
                                </span>
                            </div>
                        </div>
                    {/if}
                </div>

                <!-- Close Button -->
                <button 
                    class="ml-4 p-2 rounded-lg text-light-text-muted hover:text-theme-500 hover:bg-light-hover dark:hover:bg-dark-hover"
                    on:click={close}
                >
                    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
                    </svg>
                </button>
            </div>
        </div>

        <!-- Content -->
        <div class="p-4 max-h-[calc(100vh-12rem)] overflow-y-auto">
            <div class="grid gap-4">
                <!-- Trade Info Section -->
                <div class="bg-light-panel dark:bg-dark-panel rounded-xl p-4">
                    <h3 class="text-sm font-semibold text-theme-500 mb-3">Trade Information</h3>
                    <div class="grid grid-cols-2 lg:grid-cols-4 gap-x-6 gap-y-3">
                        {#if trade.orderId}
                        <div class="flex items-center gap-2">
                            <div class="text-sm text-light-text-muted dark:text-dark-text-muted">Order ID</div>
                            <div class="text-sm font-mono text-light-text dark:text-dark-text">
                                {trade.orderId}
                            </div>
                        </div>
                        {/if}
                        
                        <div>
                            <div class="text-sm text-light-text-muted dark:text-dark-text-muted">Amount</div>
                            <div class="text-sm font-bold text-light-text dark:text-dark-text">
                                {formatCurrency(trade.amount || 0)}
                            </div>
                        </div>
                        
                        <div>
                            <div class="text-sm text-light-text-muted dark:text-dark-text-muted">Quantity</div>
                            <div class="text-sm font-bold text-light-text dark:text-dark-text">
                                {trade.quantity || 0}
                            </div>
                        </div>
                        
                        {#if trade.leverage}
                        <div>
                            <div class="text-sm text-light-text-muted dark:text-dark-text-muted">Leverage</div>
                            <div class="text-sm font-bold text-light-text dark:text-dark-text">
                                {trade.leverage}x
                            </div>
                        </div>
                        {/if}
                        
                        {#if trade.strategy}
                        <div>
                            <div class="text-sm text-light-text-muted dark:text-dark-text-muted">Strategy</div>
                            <div class="text-sm font-bold text-light-text dark:text-dark-text">
                                {trade.strategy}
                            </div>
                        </div>
                        {/if}
                    </div>

                    <!-- Psychology Metrics -->
                    <div class="grid grid-cols-2 lg:grid-cols-4 gap-x-6 gap-y-3 mt-3">
                        {#if trade.confidenceLevel}
                        <div>
                            <div class="text-sm text-light-text-muted dark:text-dark-text-muted">Confidence Level</div>
                            <div class="flex items-center gap-2">
                                <div class="flex-1 h-1.5 bg-light-hover dark:bg-dark-hover rounded-full overflow-hidden">
                                    <div class="h-full bg-theme-500" style="width: {(trade.confidenceLevel) * 10}%"></div>
                                </div>
                                <span class="text-sm font-medium text-theme-500">{trade.confidenceLevel}/10</span>
                            </div>
                        </div>
                        {/if}
                        
                        {#if trade.greedLevel}
                        <div>
                            <div class="text-sm text-light-text-muted dark:text-dark-text-muted">Greed Level</div>
                            <div class="flex items-center gap-2">
                                <div class="flex-1 h-1.5 bg-light-hover dark:bg-dark-hover rounded-full overflow-hidden">
                                    <div class="h-full bg-theme-500" style="width: {(trade.greedLevel) * 10}%"></div>
                                </div>
                                <span class="text-sm font-medium text-theme-500">{trade.greedLevel}/10</span>
                            </div>
                        </div>
                        {/if}
                        
                        {#if trade.emotions}
                        <div class="lg:col-span-2">
                            <div class="text-sm text-light-text-muted dark:text-dark-text-muted">Emotions</div>
                            <div class="text-sm text-light-text dark:text-dark-text">
                                {trade.emotions}
                            </div>
                        </div>
                        {/if}
                    </div>
                </div>

                <!-- Price Section -->
                <div class="bg-light-panel dark:bg-dark-panel rounded-xl p-4">
                    <h3 class="text-sm font-semibold text-theme-500 mb-3">Price Details</h3>
                    <div class="grid grid-cols-2 lg:grid-cols-4 gap-x-6 gap-y-3">
                        <div>
                            <div class="text-sm text-light-text-muted dark:text-dark-text-muted">Entry Price</div>
                            <div class="text-sm font-bold text-light-text dark:text-dark-text">
                                {formatCurrency(trade.entryPrice || 0)}
                            </div>
                        </div>
                        
                        {#if trade.exitPrice}
                        <div>
                            <div class="text-sm text-light-text-muted dark:text-dark-text-muted">Exit Price</div>
                            <div class="text-sm font-bold text-light-text dark:text-dark-text">
                                {formatCurrency(trade.exitPrice)}
                            </div>
                        </div>
                        {/if}
                        
                        {#if trade.stopLoss}
                        <div>
                            <div class="text-sm text-light-text-muted dark:text-dark-text-muted">Stop Loss</div>
                            <div class="text-sm font-bold text-red-500">
                                {formatCurrency(trade.stopLoss)}
                            </div>
                        </div>
                        {/if}
                        
                        {#if trade.takeProfit}
                        <div>
                            <div class="text-sm text-light-text-muted dark:text-dark-text-muted">Take Profit</div>
                            <div class="text-sm font-bold text-green-500">
                                {formatCurrency(trade.takeProfit)}
                            </div>
                        </div>
                        {/if}
                    </div>
                </div>

                <!-- Position History Section - Show only if exists -->
                {#if positionHistory && positionHistory.length > 0}
                <div class="bg-light-panel dark:bg-dark-panel rounded-xl p-4">
                    <h3 class="text-sm font-semibold text-theme-500 mb-3">Trade Chart</h3>
                    
                    <!-- Chart Container -->
                    <div 
                        class="w-full h-[300px] mb-4 rounded-lg overflow-hidden border border-light-border dark:border-dark-border relative chart-container"
                        bind:this={chartContainer}
                    >
                        {#if chartLoading}
                            <div class="w-full h-full flex items-center justify-center bg-light-hover dark:bg-dark-hover">
                                <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-theme-500"></div>
                            </div>
                        {:else if chartError}
                            <div class="w-full h-full flex items-center justify-center bg-light-hover dark:bg-dark-hover text-light-text-muted dark:text-dark-text-muted">
                                <div class="text-center p-4">
                                    <svg class="w-10 h-10 mx-auto mb-2 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/>
                                    </svg>
                                    <p>Failed to load chart data</p>
                                    <button 
                                        class="mt-2 px-3 py-1 text-xs bg-theme-500/10 text-theme-500 rounded-md hover:bg-theme-500/20"
                                        on:click={fetchHistoricalData}
                                    >
                                        Retry
                                    </button>
                                </div>
                            </div>
                        {:else if chartData.length > 0}
                            <!-- Chart Legend -->
                            <div class="absolute top-2 right-2 bg-black/80 rounded-md p-3 text-xs text-white z-30 flex flex-col gap-2 shadow-lg chart-legend">
                                <div class="text-center font-bold border-b border-white/20 pb-1 mb-1">
                                    {trade.symbol} {trade.side} - {formatTimeframe(currentInterval)}
                                </div>
                                <div class="flex items-center gap-2">
                                    <span class="w-4 h-4 rounded-full bg-blue-500 shadow-glow-blue"></span>
                                    <span>Entry: {formatPrice(trade.entryPrice)}</span>
                                </div>
                                {#if trade.status === 'CLOSED'}
                                <div class="flex items-center gap-2">
                                    <span class="w-4 h-4 rounded-full {trade.pnl >= 0 ? 'bg-green-500 shadow-glow-green' : 'bg-red-500 shadow-glow-red'}"></span>
                                    <span>Exit: {formatPrice(trade.exitPrice)}</span>
                                </div>
                                {/if}
                                {#if trade.stopLoss}
                                <div class="flex items-center gap-2">
                                    <span class="w-4 h-4 rounded-full bg-red-500 shadow-glow-red"></span>
                                    <span>Stop Loss: {formatPrice(trade.stopLoss)}</span>
                                </div>
                                {/if}
                                {#if trade.takeProfit}
                                <div class="flex items-center gap-2">
                                    <span class="w-4 h-4 rounded-full bg-green-500 shadow-glow-green"></span>
                                    <span>Take Profit: {formatPrice(trade.takeProfit)}</span>
                                </div>
                                {/if}
                                {#if positionHistory.some(p => p.action === 'INCREASE')}
                                <div class="flex items-center gap-2">
                                    <span class="w-4 h-4 rounded-full bg-blue-500 shadow-glow-blue"></span>
                                    <span>Increase Position</span>
                                </div>
                                {/if}
                                {#if positionHistory.some(p => p.action === 'DECREASE' && p.pnl >= 0)}
                                <div class="flex items-center gap-2">
                                    <span class="w-4 h-4 rounded-full bg-green-500 shadow-glow-green"></span>
                                    <span>Profit Take</span>
                                </div>
                                {/if}
                                {#if positionHistory.some(p => p.action === 'DECREASE' && p.pnl < 0)}
                                <div class="flex items-center gap-2">
                                    <span class="w-4 h-4 rounded-full bg-red-500 shadow-glow-red"></span>
                                    <span>Loss Cut</span>
                                </div>
                                {/if}
                            </div>
                            
                            <!-- Zoom Controls -->
                            <div class="absolute bottom-2 right-2 flex gap-1 z-30 zoom-controls">
                                <button 
                                    class="w-8 h-8 rounded-full bg-black/60 text-white flex items-center justify-center hover:bg-black/80 transition-colors"
                                    on:click={zoomIn}
                                    title="Zoom In"
                                >
                                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"></path>
                                    </svg>
                                </button>
                                <button 
                                    class="w-8 h-8 rounded-full bg-black/60 text-white flex items-center justify-center hover:bg-black/80 transition-colors"
                                    on:click={zoomOut}
                                    title="Zoom Out"
                                >
                                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M18 12H6"></path>
                                    </svg>
                                </button>
                                <button 
                                    class="w-8 h-8 rounded-full bg-black/60 text-white flex items-center justify-center hover:bg-black/80 transition-colors"
                                    on:click={resetZoom}
                                    title="Reset Zoom"
                                >
                                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5v-4m0 4h-4m4 0l-5-5"></path>
                                    </svg>
                                </button>
                            </div>
                            
                            <!-- Zoom Level Indicator -->
                            <div class="absolute bottom-2 left-2 bg-black/60 text-white text-xs px-2 py-1 rounded z-30">
                                Zoom: {(chartScale * 100).toFixed(0)}%
                            </div>
                            
                            <!-- Layer for tooltips -->
                            <div id="chart-tooltips" class="absolute inset-0 pointer-events-none z-50"></div>
                            
                            <!-- Layer for markers (will be drawn on canvas but conceptually separate) -->
                            <div class="marker-layer"></div>
                        {/if}
                    </div>

                    <h3 class="text-sm font-semibold text-theme-500 mb-3">Position History</h3>
                    
                    <!-- Visual Timeline of Position Changes -->
                    <div class="mb-4">
                        <div class="relative h-5 flex items-center">
                            <!-- Progress Track -->
                            <div class="absolute inset-0 bg-light-hover dark:bg-dark-hover rounded-md overflow-hidden">
                                {#if positionHistory.length > 0}
                                    {@const sortedPositionHistory = [...positionHistory].sort((a, b) => new Date(a.date) - new Date(b.date))}
                                    {@const totalPercentage = sortedPositionHistory.reduce((sum, entry) => sum + parseFloat(entry.percentage || 0), 0)}
                                    {@const scaleFactor = totalPercentage > 0 ? 100 / totalPercentage : 1}
                                    
                                    {#each sortedPositionHistory as entry, i}
                                        {@const rawPercentage = parseFloat(entry.percentage || 0)}
                                        {@const normalizedPercentage = rawPercentage * scaleFactor}
                                        {@const isIncrease = entry.action === 'INCREASE'}
                                        {@const isProfitable = entry.pnl >= 0}
                                        {@const startPosition = i === 0 ? 0 : sortedPositionHistory.slice(0, i).reduce((sum, prev) => sum + parseFloat(prev.percentage || 0) * scaleFactor, 0)}
                                        
                                        <div 
                                            class="absolute top-0 bottom-0 {isIncrease ? 'bg-blue-500/90' : (isProfitable ? 'bg-green-500/90' : 'bg-red-500/90')}"
                                            style="left: {startPosition}%; width: {normalizedPercentage}%;"
                                        ></div>
                                    {/each}
                                {/if}
                            </div>
                            
                            <!-- Time markers -->
                            {#if positionHistory.length > 0}
                                {@const sortedPositionHistory = [...positionHistory].sort((a, b) => new Date(a.date) - new Date(b.date))}
                                {@const totalPercentage = sortedPositionHistory.reduce((sum, entry) => sum + parseFloat(entry.percentage || 0), 0)}
                                {@const scaleFactor = totalPercentage > 0 ? 100 / totalPercentage : 1}
                                
                                {#each sortedPositionHistory as entry, i}
                                    {@const rawPercentage = parseFloat(entry.percentage || 0)}
                                    {@const normalizedPercentage = rawPercentage * scaleFactor}
                                    {@const startPosition = i === 0 ? 0 : sortedPositionHistory.slice(0, i).reduce((sum, prev) => sum + parseFloat(prev.percentage || 0) * scaleFactor, 0)}
                                    {@const markerPosition = startPosition + (normalizedPercentage / 2)}
                                    
                                    <div 
                                        class="absolute top-full mt-1 transform -translate-x-1/2 text-xs text-light-text-muted dark:text-dark-text-muted"
                                        style="left: {markerPosition}%;"
                                    >
                                        <div class="w-px h-2 bg-light-text-muted/50 dark:bg-dark-text-muted/50 mx-auto mb-1"></div>
                                        <div>{i+1}</div>
                                    </div>
                                {/each}
                            {/if}
                        </div>
                    </div>
                    
                    <!-- Position History Cards -->
                    <div class="space-y-2">
                        {#each positionHistory.sort((a, b) => new Date(a.date) - new Date(b.date)) as entry, i}
                            {@const isIncrease = entry.action === 'INCREASE'}
                            {@const isProfitable = entry.pnl >= 0}
                            {@const date = new Date(entry.date)}
                            <div class="p-3 rounded-lg {isIncrease ? 'bg-blue-500/10' : (isProfitable ? 'bg-green-500/10' : 'bg-red-500/10')} border border-light-border dark:border-dark-border">
                                <div class="flex items-center justify-between">
                                    <div class="flex items-center gap-2">
                                        <div class="flex items-center justify-center w-5 h-5 rounded-full bg-theme-500/10 text-theme-500 text-xs font-medium">
                                            {i+1}
                                        </div>
                                        <span class="text-sm font-medium text-light-text dark:text-dark-text">
                                            {date.toLocaleDateString()} {date.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                                        </span>
                                        <span class="px-2 py-0.5 text-xs rounded-full {isIncrease ? 'bg-blue-500/10 text-blue-500' : 'bg-orange-500/10 text-orange-500'}">
                                            {isIncrease ? 'INCREASE' : 'DECREASE'}
                                        </span>
                                    </div>
                                    {#if !isIncrease}
                                        <div class="text-sm font-semibold {isProfitable ? 'text-green-500' : 'text-red-500'}">
                                            {formatCurrency(entry.pnl)}
                                        </div>
                                    {/if}
                                </div>
                                <div class="grid grid-cols-3 mt-2 text-xs">
                                    <div>
                                        <span class="text-light-text-muted dark:text-dark-text-muted">Quantity:</span>
                                        <span class="ml-1 text-light-text dark:text-dark-text">{entry.quantity}</span>
                                    </div>
                                    <div>
                                        <span class="text-light-text-muted dark:text-dark-text-muted">Percentage:</span>
                                        <span class="ml-1 text-light-text dark:text-dark-text">{entry.percentage}%</span>
                                    </div>
                                    <div>
                                        <span class="text-light-text-muted dark:text-dark-text-muted">Price:</span>
                                        <span class="ml-1 text-light-text dark:text-dark-text">{formatCurrency(entry.price)}</span>
                                    </div>
                                </div>
                            </div>
                        {/each}
                    </div>
                    
                    <!-- Summary Stats -->
                    {#if positionHistory.length > 1}
                        {@const increases = positionHistory.filter(entry => entry.action === 'INCREASE')}
                        {@const decreases = positionHistory.filter(entry => entry.action === 'DECREASE')}
                        {@const totalPnl = decreases.reduce((sum, entry) => sum + entry.pnl, 0)}
                        {@const profitCloses = decreases.filter(entry => entry.pnl > 0)}
                        {@const lossCloses = decreases.filter(entry => entry.pnl < 0)}
                        
                        <div class="mt-4 p-3 bg-theme-500/5 rounded-lg border border-theme-500/10">
                            <div class="flex justify-between items-center">
                                <h4 class="text-sm font-medium text-theme-500">Summary</h4>
                                <div class="text-sm font-semibold {totalPnl >= 0 ? 'text-green-500' : 'text-red-500'}">
                                    {formatCurrency(totalPnl)}
                                </div>
                            </div>
                            <div class="grid grid-cols-4 gap-2 mt-2 text-xs">
                                <div>
                                    <div class="text-light-text-muted dark:text-dark-text-muted">Increases</div>
                                    <div class="text-blue-500">{increases.length}</div>
                                </div>
                                <div>
                                    <div class="text-light-text-muted dark:text-dark-text-muted">Decreases</div>
                                    <div class="text-orange-500">{decreases.length}</div>
                                </div>
                                <div>
                                    <div class="text-light-text-muted dark:text-dark-text-muted">Profitable</div>
                                    <div class="text-green-500">{profitCloses.length}</div>
                                </div>
                                <div>
                                    <div class="text-light-text-muted dark:text-dark-text-muted">Losing</div>
                                    <div class="text-red-500">{lossCloses.length}</div>
                                </div>
                            </div>
                        </div>
                    {/if}
                </div>
                {/if}

                <!-- Analysis Section -->
                <div class="grid lg:grid-cols-2 gap-4">
                    <!-- Left Column - Only show if has entry or exit reason -->
                    {#if trade.entryReason || trade.exitReason}
                    <div class="bg-light-panel dark:bg-dark-panel rounded-xl p-4">
                        <h3 class="text-sm font-semibold text-theme-500 mb-3">Trade Analysis</h3>
                        <div class="space-y-3">
                            {#if trade.entryReason}
                            <div>
                                <div class="text-sm text-light-text-muted dark:text-dark-text-muted">Entry Reason</div>
                                <div class="text-sm text-light-text dark:text-dark-text mt-1">
                                    {trade.entryReason}
                                </div>
                            </div>
                            {/if}
                            
                            {#if trade.exitReason}
                            <div>
                                <div class="text-sm text-light-text-muted dark:text-dark-text-muted">Exit Reason</div>
                                <div class="text-sm text-light-text dark:text-dark-text mt-1">
                                    {trade.exitReason}
                                </div>
                            </div>
                            {/if}
                        </div>
                    </div>
                    {/if}

                    <!-- Right Column - Only show if has notes -->
                    {#if trade.notes}
                    <div class="bg-light-panel dark:bg-dark-panel rounded-xl p-4">
                        <h3 class="text-sm font-semibold text-theme-500 mb-3">Notes</h3>
                        <div class="space-y-3">
                            <div>
                                <div class="text-sm text-light-text-muted dark:text-dark-text-muted">Notes</div>
                                <div class="text-sm text-light-text dark:text-dark-text mt-1 rich-text-content">
                                    {@html trade.notes}
                                </div>
                            </div>
                        </div>
                    </div>
                    {/if}
                </div>

                <!-- URL and Screenshot - Only show if has URL -->
                {#if trade.url}
                <div class="bg-light-panel dark:bg-dark-panel rounded-xl p-4">
                    <h3 class="text-sm font-semibold text-theme-500 mb-3">Reference</h3>
                    <div class="space-y-3">
                        <a 
                            href={trade.url} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            class="text-sm text-theme-500 hover:underline break-all inline-flex items-center gap-1"
                        >
                            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/>
                            </svg>
                            {trade.url}
                        </a>
                        {#if isImageUrl(trade.url)}
                            <div class="mt-2 rounded-lg overflow-hidden border border-light-border dark:border-dark-hover">
                                <a 
                                    href={trade.url} 
                                    target="_blank" 
                                    rel="noopener noreferrer"
                                    class="block hover:opacity-90 transition-opacity"
                                >
                                    <img 
                                        src={trade.url} 
                                        alt="Trade Reference" 
                                        class="w-full max-h-96 object-contain bg-light-hover dark:bg-dark-hover"
                                        on:error={handleImageError}
                                    />
                                </a>
                            </div>
                        {/if}
                    </div>
                </div>
                {/if}

                <!-- Tags - Only show if has tags -->
                {#if trade.tags && trade.tags.length > 0}
                <div class="bg-light-panel dark:bg-dark-panel rounded-xl p-4">
                    <h3 class="text-sm font-semibold text-theme-500 mb-3">Tags</h3>
                    <div class="flex flex-wrap gap-2">
                        {#each trade.tags as tag}
                            {@const tagColor = getTagColor(tag)}
                            <span class="px-2 py-0.5 rounded-full text-xs {tagColor.bg} {tagColor.text}">
                                {tag}
                            </span>
                        {/each}
                    </div>
                </div>
                {/if}
            </div>
        </div>
    </div>
</div>
{/if}

<style>
    /* Smooth scrolling */
    .overflow-y-auto {
        scrollbar-width: thin;
        scrollbar-color: var(--theme-500) transparent;
    }

    .overflow-y-auto::-webkit-scrollbar {
        width: 4px;
    }

    .overflow-y-auto::-webkit-scrollbar-track {
        background: transparent;
    }

    .overflow-y-auto::-webkit-scrollbar-thumb {
        background-color: var(--theme-500);
        border-radius: 2px;
    }

    /* Animations */
    @keyframes ping {
        75%, 100% {
            transform: scale(2);
            opacity: 0;
        }
    }

    .animate-ping {
        animation: ping 1.5s cubic-bezier(0, 0, 0.2, 1) infinite;
    }

    /* Rich text content styles */
    :global(.rich-text-content p) {
        @apply mb-2;
    }
    
    :global(.rich-text-content ul) {
        @apply list-disc pl-5 mb-2;
    }
    
    :global(.rich-text-content ol) {
        @apply list-decimal pl-5 mb-2;
    }
    
    :global(.rich-text-content a) {
        @apply text-theme-500 hover:underline;
    }
    
    :global(.rich-text-content strong) {
        @apply font-bold;
    }
    
    :global(.rich-text-content em) {
        @apply italic;
    }
    
    :global(.rich-text-content u) {
        @apply underline;
    }
    
    :global(.rich-text-content mark) {
        @apply bg-yellow-200 dark:bg-yellow-500/30;
    }
    
    :global(.rich-text-content .text-left) {
        text-align: left;
    }
    
    :global(.rich-text-content .text-center) {
        text-align: center;
    }
    
    :global(.rich-text-content .text-right) {
        text-align: right;
    }

    /* Add smooth animation for chart hover effects */
    canvas {
        transition: transform 0.2s ease;
    }
    
    /* Add glow effect for chart markers */
    @keyframes markerGlow {
        0%, 100% { filter: drop-shadow(0 0 3px rgba(255, 255, 255, 0.7)); }
        50% { filter: drop-shadow(0 0 8px rgba(255, 255, 255, 1.0)); }
    }
    
    .marker-glow {
        animation: markerGlow 2s infinite;
    }

    /* Add glow effects for chart elements */
    .shadow-glow-blue {
        box-shadow: 0 0 8px 2px rgba(52, 152, 219, 0.6);
    }
    
    .shadow-glow-green {
        box-shadow: 0 0 8px 2px rgba(46, 204, 113, 0.6);
    }
    
    .shadow-glow-red {
        box-shadow: 0 0 8px 2px rgba(231, 76, 60, 0.6);
    }

    /* Tooltip styles */
    #chart-tooltip {
        transition: opacity 0.2s ease;
        animation: fadeIn 0.2s ease;
    }
    
    @keyframes fadeIn {
        from { opacity: 0; }
        to { opacity: 1; }
    }
    
    /* เพิ่ม z-index สูงๆ ให้กับ tooltip */
    #chart-tooltips {
        z-index: 50;
    }

    /* Add cursor styles for chart interactions */
    canvas {
        cursor: grab;
    }
    
    canvas:active {
        cursor: grabbing;
    }
    
    /* Zoom controls hover effect */
    button:hover svg {
        transform: scale(1.1);
        transition: transform 0.2s ease;
    }
    
    /* ... existing styles ... */
    
    /* Ensure proper layering of chart elements */
    .chart-container {
        position: relative;
    }
    
    /* Make canvas stay at the back */
    canvas {
        position: relative;
        z-index: 1;
        transition: transform 0.2s ease;
        cursor: grab;
    }
    
    canvas:active {
        cursor: grabbing;
    }
    
    /* Ensure markers are above candles */
    .marker-layer {
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        pointer-events: none;
        z-index: 20;
    }
    
    /* Ensure tooltips are at the very top */
    #chart-tooltips {
        z-index: 50;
    }
    
    /* Ensure legend is above everything */
    .chart-legend {
        z-index: 30;
    }
    
    /* Ensure zoom controls are above everything */
    .zoom-controls {
        z-index: 30;
    }
    
    /* Improve marker glow animation for better visibility */
    @keyframes markerGlow {
        0%, 100% { filter: drop-shadow(0 0 5px rgba(255, 255, 255, 0.7)); }
        50% { filter: drop-shadow(0 0 12px rgba(255, 255, 255, 1.0)); }
    }
    
    .marker-glow {
        animation: markerGlow 2s infinite;
    }
    
    /* Enhanced glow effects for chart elements */
    .shadow-glow-blue {
        box-shadow: 0 0 12px 4px rgba(52, 152, 219, 0.7);
    }
    
    .shadow-glow-green {
        box-shadow: 0 0 12px 4px rgba(46, 204, 113, 0.7);
    }
    
    .shadow-glow-red {
        box-shadow: 0 0 12px 4px rgba(231, 76, 60, 0.7);
    }
</style>
