// ===============================================================================
// ARBITRAGE ENGINE API v1.0 (HIGH-FREQUENCY MONITORING)
// This service simulates monitoring potential arbitrage opportunities across 
// multiple decentralized exchanges (DEXs) using a robust FallbackProvider.
// FIX: Using StaticJsonRpcProvider for the fallback pool to reduce log spam 
// from constantly failing public endpoints during setup.
// ===============================================================================

const express = require('express');
const cors = require('cors');
const { ethers } = require('ethers');

const app = express();
app.use(cors({ origin: '*', methods: ['GET', 'POST', 'OPTIONS'] }));
app.use(express.json());

const PORT = process.env.ARBITRAGE_PORT || 8082;

// ===============================================================================
// CONFIGURATION
// ===============================================================================

const ETHERSCAN_RPC_URL = process.env.ETHERSCAN_RPC_URL;

// RPC ENDPOINTS (The secure URL is prioritized if available)
let RPC_URLS = [
    // Standard Public Endpoints (used as fallbacks)
    'https://ethereum-rpc.publicnode.com',
    'https://cloudflare-eth.com',
    'https://eth.meowrpc.com',      
    'https://eth.llamarpc.com',
    'https://1rpc.io/eth'
];

if (ETHERSCAN_RPC_URL) {
    RPC_URLS.unshift(ETHERSCAN_RPC_URL);
    console.log("✅ Using secure RPC URL from environment variable for primary connection.");
} else {
    console.log("⚠️ Secure RPC URL not found. Relying solely on public endpoints.");
}


// Simulated DEX Pairs to Monitor for Arbitrage
const ARBITRAGE_PAIRS = [
    { name: "WETH/USDT (Uniswap)", poolAddress: "0x2A1530C4...4c13" },
    { name: "WETH/USDC (Sushiswap)", poolAddress: "0x397FF154...B4f8" },
    { name: "DAI/ETH (Balancer)", poolAddress: "0xBA122222...7aA5" }
];

let provider = null;
let currentBlock = 0;
let monitorStatus = 'initializing';
let lastOpportunity = null;

// ===============================================================================
// PROVIDER INITIALIZATION WITH FALLBACK (The requested robust implementation)
// ===============================================================================

async function initProvider() {
    monitorStatus = 'connecting';
    try {
        // FIX APPLIED: Use StaticJsonRpcProvider to prevent log spam from 
        // repeated connection checks on unstable public RPCs during setup.
        const providers = RPC_URLS.map(url => new ethers.StaticJsonRpcProvider(url, 'mainnet'));
        
        // Use FallbackProvider for robustness and automatic failover
        const fallbackProvider = new ethers.FallbackProvider(providers, 1);
        
        const blockNum = await fallbackProvider.getBlockNumber();
        console.log(`✅ Arbitrage Engine: Connected to Ethereum Mainnet at block: ${blockNum} using FallbackProvider.`);
        
        provider = fallbackProvider;
        monitorStatus = 'connected';
        return true;
    } catch (e) {
        console.error('❌ Arbitrage Engine: Failed to connect to all RPC endpoints:', e.message);
        provider = null;
        monitorStatus = 'disconnected';
        return false;
    }
}

// ===============================================================================
// CORE LOGIC: Find Arbitrage Opportunities
// ===============================================================================

async function monitorArbitrage() {
    if (!provider) {
        console.warn('⚠️ Arbitrage Engine: Provider not initialized. Attempting reconnection...');
        await initProvider();
        if (!provider) return;
    }

    try {
        const blockNum = await provider.getBlockNumber();
        currentBlock = blockNum;
        
        let foundOpportunity = false;
        const reports = [];

        for (const pair of ARBITRAGE_PAIRS) {
            // Simulate fetching real-time price data (e.g., calling getReserves)
            const priceDifference = (Math.random() - 0.5) * 0.003; // Simulate -0.3% to +0.3% difference
            const isArbitrage = Math.abs(priceDifference) > 0.0015; // > 0.15% opportunity

            reports.push({
                pair: pair.name,
                difference: (priceDifference * 100).toFixed(4) + '%',
                opportunity: isArbitrage
            });
            
            if (isArbitrage) {
                foundOpportunity = true;
                lastOpportunity = {
                    timestamp: new Date().toISOString(),
                    blockNumber: currentBlock,
                    details: `${pair.name}: ${reports[reports.length - 1].difference} difference.`
                };
            }
        }
        
        console.log(`[ARBITRAGE MONITOR] Block: ${blockNum}. Opportunities checked: ${ARBITRAGE_PAIRS.length}. Arbitrage Found: ${foundOpportunity ? 'YES' : 'No'}.`);

    } catch (error) {
        console.error('[ARBITRAGE FAILURE] Could not fetch data (RPC error). FallbackProvider should auto-switch.', error.message);
        monitorStatus = 'error';
    }
}

// ===============================================================================
// AUTO-MONITOR START
// ===============================================================================

function startAutoMonitor() {
    console.log(`⏱️ Arbitrage Engine: Starting auto-monitor. Running every 2 seconds for high-frequency checks...`);
    // Run monitoring every 2 seconds
    setInterval(monitorArbitrage, 2000);  
    monitorArbitrage();
}

// ===============================================================================
// STATUS & HEALTH ENDPOINTS
// ===============================================================================

app.get('/', (req, res) => {
    res.json({
        name: 'Arbitrage Engine API',
        version: '1.0.0',
        status: monitorStatus,
        mode: `High-Frequency Monitoring (Rate: 2s)`,
        currentBlock: currentBlock
    });
});

app.get('/arbitrage-status', async (req, res) => {
    res.json({
        status: monitorStatus,
        blockchainConnection: provider ? 'robust_connected' : 'disconnected',
        currentBlock: currentBlock,
        lastOpportunity: lastOpportunity,
        monitoredPairsCount: ARBITRAGE_PAIRS.length,
        timestamp: new Date().toISOString()
    });
});


// ===============================================================================
// START SERVER
// ===============================================================================

initProvider().then(() => {
    app.listen(PORT, () => {
        console.log(`🚀 Arbitrage Engine API v1.0 listening on port ${PORT}`);
        // Start the automated monitoring loop after the server is listening
        startAutoMonitor();
    });
});
