
require('dotenv').config();
const { Client, GatewayIntentBits } = require('discord.js');
const axios = require('axios');

// Initialize Discord bot client
const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages] });

// Your bot token (use environment variable for security)
const token = process.env.DISCORD_BOT_TOKEN;

// The channel ID where the floor price updates will be reflected in the name
const floorPriceChannelId = '1285605233699061863'; // Replace with your actual channel ID

// The channel ID where the market cap updates will be reflected in the name
const marketCapChannelId = '1286442064669708400'; // Channel ID for market cap updates

// Function to get the current timestamp (seconds since Epoch)
const getTimestamp = () => {
    return Math.floor(Date.now() / 1000);
};

// Function to fetch Kasper floor price from the API with retries
async function getFloorPrice(retries = 3) {
    const timestamp = getTimestamp();
    const apiUrl = `https://storage.googleapis.com/kspr-api-v1/marketplace/marketplace.json?t=${timestamp}`;

    console.log('Fetching floor price from API...'); // Log when fetching starts

    for (let attempt = 0; attempt < retries; attempt++) {
        try {
            const response = await axios.get(apiUrl);
            const data = response.data;

            // Extract the KASPER floor price from the data
            const kasperData = data.KASPER;
            const floorPrice = kasperData ? kasperData.floor_price.toFixed(5) : null; // Format to 5 decimal places

            console.log(`Fetched floor price: ${floorPrice} KAS`); // Log the fetched price
            return floorPrice;
        } catch (error) {
            console.error('Error fetching Kasper floor price:', error.message); // Log specific error message
            if (attempt < retries - 1) {
                console.log(`Retrying... (${attempt + 1})`);
                await new Promise(resolve => setTimeout(resolve, 1000)); // Wait before retrying
            }
        }
    }

    return null; // Return null if all attempts fail
}

// Function to fetch Kasper market cap from the API
async function getMarketCap() {
    const apiUrl = 'https://kasper-charts-ae1d58154e70.herokuapp.com/prices?range=1h';  // Fetch from the /prices endpoint
    try {
        const response = await axios.get(apiUrl);
        const data = response.data;

        if (data && data.length > 0) {
            const latestData = data[data.length - 1];
            const marketCap = latestData.marketCap;
            console.log('Fetched Market Cap:', marketCap);
            return marketCap;
        } else {
            console.error('No data found in the /prices response');
            return null;
        }
    } catch (error) {
        console.error('Error fetching market cap from /prices API:', error);
        return null;
    }
}

// Function to update the channel name with the KASPER floor price
async function updateFloorPriceChannelName() {
    const floorPrice = await getFloorPrice();

    console.log('Attempting to update floor price channel name...'); // Log this line

    if (floorPrice !== null) {
        const channel = await client.channels.fetch(floorPriceChannelId);
        const newChannelName = `KASPER Floor: ${floorPrice} KAS`;

        console.log(`New floor price channel name will be: ${newChannelName}`); // Log the new channel name

        try {
            await channel.setName(newChannelName);
            console.log(`Floor price channel name updated to: ${newChannelName}`);
        } catch (error) {
            console.error('Error updating floor price channel name:', error.message); // Log specific error message
        }
    } else {
        console.log('No floor price available to update the channel name.');
    }
}

// Function to update the market cap channel name
async function updateMarketCapChannelName() {
    const marketCap = await getMarketCap();

    console.log('Attempting to update market cap channel name...'); // Log this line

    if (marketCap !== null) {
        const channel = await client.channels.fetch(marketCapChannelId);
        const newChannelName = `MC: ${marketCap}`;  // Update the channel name with the new shorter format

        console.log(`New market cap channel name will be: ${newChannelName}`); // Log the new channel name

        try {
            await channel.setName(newChannelName);
            console.log(`Market cap channel name updated to: ${newChannelName}`);
        } catch (error) {
            console.error('Error updating market cap channel name:', error.message); // Log specific error message
        }
    } else {
        console.log('No market cap available to update the channel name.');
    }
}

// Set an interval to update the market cap channel name every 15 seconds
client.once('ready', () => {
    console.log('Bot is ready!');

    // Update the floor price channel name immediately, then every 15 minutes
    updateFloorPriceChannelName();
    setInterval(updateFloorPriceChannelName, 900000); // 15 minutes

    // Update the market cap channel name every 60 seconds
    updateMarketCapChannelName();
    setInterval(updateMarketCapChannelName, 60000); // 60 seconds
});

// Log in to Discord with the bot's token
client.login(token)
    .then(() => console.log('Bot logged in successfully.'))
    .catch(error => console.error('Failed to log in:', error.message)); // Log any login errors
