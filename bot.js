
require('dotenv').config();
const { Client, GatewayIntentBits } = require('discord.js');
const axios = require('axios');

// Initialize Discord bot client
const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages] });

// Your bot token (use environment variable for security)
const token = process.env.DISCORD_BOT_TOKEN;

// The channel ID where the floor price updates will be reflected in the name
const channelId = '1285605233699061863'; // Replace with your actual channel ID

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

// Function to update the channel name with the KASPER floor price
async function updateChannelName() {
    const floorPrice = await getFloorPrice();

    console.log('Attempting to update channel name...'); // Log this line

    if (floorPrice !== null) {
        const channel = await client.channels.fetch(channelId);
        const newChannelName = `KASPER Floor: ${floorPrice} KAS`;

        console.log(`New channel name will be: ${newChannelName}`); // Log the new channel name

        // Set the new channel name
        try {
            await channel.setName(newChannelName);
            console.log(`Channel name updated to: ${newChannelName}`);
        } catch (error) {
            console.error('Error updating channel name:', error.message); // Log specific error message
        }
    } else {
        console.log('No floor price available to update the channel name.'); // Log when price is not available
    }
}

// Set an interval to update the channel name every 15 minutes (900000 ms)
client.once('ready', () => {
    console.log('Bot is ready!');

    // Update the channel name immediately, then every 15 minutes
    updateChannelName();
    setInterval(updateChannelName, 900000); // 15 minutes
});

// Log in to Discord with the bot's token
client.login(token)
    .then(() => console.log('Bot logged in successfully.'))
    .catch(error => console.error('Failed to log in:', error.message)); // Log any login errors


// Function to fetch market cap from the /prices API
async function getMarketCap() {
    const apiUrl = 'https://kasper-charts-ae1d58154e70.herokuapp.com/prices?range=1h';  // Fetch from the /prices endpoint
    try {
        const response = await axios.get(apiUrl);
        const data = response.data;
        
        // Assuming the last data point in the response contains the latest market cap
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

// Function to update the original channel name with the floor price (already in the code)
async function updateChannelNameWithFloorPrice() {
    const floorPrice = await getFloorPrice();
    const floorPriceChannel = await client.channels.fetch(channelId);  // Channel ID for the floor price

    if (floorPrice) {
        const newChannelName = `KASPER Floor: ${floorPrice} KAS`;  // Update the channel name
        try {
            await floorPriceChannel.setName(newChannelName);
            console.log(`Channel name updated to: ${newChannelName}`);
        } catch (error) {
            console.error('Error updating channel name:', error);
        }
    } else {
        console.error('Floor price not available to update channel name.');
    }
}

// Function to post the market cap to a different channel
async function postMarketCap() {
    const marketCap = await getMarketCap();
    const marketCapChannelId = '1286442064669708400';  // New Channel ID for market cap updates
    const marketCapChannel = await client.channels.fetch(marketCapChannelId);

    if (marketCap) {
        marketCapChannel.send(`The current Kasper Market Cap is: ${marketCap}`);
    } else {
        console.error('Market cap not available to post.');
    }
}

// Append this to the existing bot's ready event to update the original channel name and post market cap in another channel
client.once('ready', () => {
    console.log('Bot is online and ready');
    updateChannelNameWithFloorPrice();  // Update the original channel name with floor price
    postMarketCap();   // Post market cap to the new channel
});
