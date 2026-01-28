export interface ExchangeDefinition {
    acronym: string;
    yahoo_stock_symbol_suffix: string;
    investing_code: string;
    google_code: string;
    country_code: string;
    yahoo_exchange_code: string;
    currency: string;
    usd_rate: number;
    gmt_off_set_milliseconds: number;
    timezone_name: string;
    timezone_short_name: string;
}

export const EXCHANGES: ExchangeDefinition[] = [
    {
        acronym: "SSE", 
        yahoo_stock_symbol_suffix: "SS", 
        investing_code: "Shanghai", 
        google_code: "SHA", 
        country_code: "cn", 
        yahoo_exchange_code: "SHH",
        currency: "CNY",
        usd_rate: 0.1432,
        gmt_off_set_milliseconds: 28800000,
        timezone_name: "Asia/Shanghai",
        timezone_short_name: "CST"
    },
    {
        acronym: "SZSE", 
        yahoo_stock_symbol_suffix: "SZ", 
        investing_code: "Shenzhen", 
        google_code: "SHE", 
        country_code: "cn", 
        yahoo_exchange_code: "SHZ",
        currency: "CNY",
        usd_rate: 0.1432,
        gmt_off_set_milliseconds: 28800000,
        timezone_name: "Asia/Shanghai",
        timezone_short_name: "CST"
    },
    {
        acronym: "HKEX", 
        yahoo_stock_symbol_suffix: "HK", 
        investing_code: "Hong Kong", 
        google_code: "HKG", 
        country_code: "hk", 
        yahoo_exchange_code: "HKG",
        currency: "HKD",
        usd_rate: 0.1284,
        gmt_off_set_milliseconds: 28800000,
        timezone_name: "Asia/Hong_Kong",
        timezone_short_name: "HKT"
    },
    {
        acronym: "NYSE", 
        yahoo_stock_symbol_suffix: "", 
        investing_code: "NYSE", 
        google_code: "NYSE", 
        country_code: "us", 
        yahoo_exchange_code: "NYQ",
        currency: "USD",
        usd_rate: 1.0,
        gmt_off_set_milliseconds: -18000000,
        timezone_name: "America/New_York",
        timezone_short_name: "EST"
    },
    {
        acronym: "NASDAQ", 
        yahoo_stock_symbol_suffix: "", 
        investing_code: "NASDAQ", 
        google_code: "NASDAQ", 
        country_code: "us", 
        yahoo_exchange_code: "NMS",
        currency: "USD",
        usd_rate: 1.0,
        gmt_off_set_milliseconds: -18000000,
        timezone_name: "America/New_York",
        timezone_short_name: "EST"
    },
    {
        acronym: "SGX", 
        yahoo_stock_symbol_suffix: "SI", 
        investing_code: "Singapore", 
        google_code: "SGX", 
        country_code: "sg", 
        yahoo_exchange_code: "SES",
        currency: "SGD",
        usd_rate: 0.7813,
        gmt_off_set_milliseconds: 28800000,
        timezone_name: "Asia/Singapore",
        timezone_short_name: "SGT"
    },
    {
        acronym: "TSE", 
        yahoo_stock_symbol_suffix: "T", 
        investing_code: "Tokyo", 
        google_code: "TYO", 
        country_code: "jp", 
        yahoo_exchange_code: "JPX",
        currency: "JPY",
        usd_rate: 0.0064,
        gmt_off_set_milliseconds: 32400000,
        timezone_name: "Asia/Tokyo",
        timezone_short_name: "JST"
    },
    {
        acronym: "NSE", 
        yahoo_stock_symbol_suffix: "NS", 
        investing_code: "NSE", 
        google_code: "NSE", 
        country_code: "in", 
        yahoo_exchange_code: "NSI",
        currency: "INR",
        usd_rate: 0.0111,
        gmt_off_set_milliseconds: 19800000,
        timezone_name: "Asia/Kolkata",
        timezone_short_name: "IST"
    },
    {
        acronym: "LSE", 
        yahoo_stock_symbol_suffix: "L", 
        investing_code: "London", 
        google_code: "LON", 
        country_code: "uk", 
        yahoo_exchange_code: "LSE",
        currency: "GBP",
        usd_rate: 1.3498,
        gmt_off_set_milliseconds: 0,
        timezone_name: "Europe/London",
        timezone_short_name: "GMT"
    },
    {
        acronym: "TSX", 
        yahoo_stock_symbol_suffix: "TO", 
        investing_code: "Toronto", 
        google_code: "TSE", 
        country_code: "ca", 
        yahoo_exchange_code: "TOR",
        currency: "CAD",
        usd_rate: 0.7251,
        gmt_off_set_milliseconds: -18000000,
        timezone_name: "America/Toronto",
        timezone_short_name: "EST"
    },
    {
        acronym: "TSXV", 
        yahoo_stock_symbol_suffix: "V", 
        investing_code: "TSXV", 
        google_code: "CVE", 
        country_code: "ca", 
        yahoo_exchange_code: "VAN",
        currency: "CAD",
        usd_rate: 0.7251,
        gmt_off_set_milliseconds: -18000000,
        timezone_name: "America/Toronto",
        timezone_short_name: "EST"
    },
    {
        acronym: "ASX", 
        yahoo_stock_symbol_suffix: "AX", 
        investing_code: "Sydney", 
        google_code: "ASX", 
        country_code: "au", 
        yahoo_exchange_code: "ASX",
        currency: "AUD",
        usd_rate: 0.31,
        gmt_off_set_milliseconds: 36000000,
        timezone_name: "Australia/Sydney",
        timezone_short_name: "AEST"
    }
];

export const VALID_EXCHANGE_ACRONYMS = EXCHANGES.map(e => e.acronym);

export const EXCHANGE_DESCRIPTIONS = EXCHANGES.map(e => 
    `${e.acronym}: ${e.investing_code}/${e.google_code} (${e.country_code.toUpperCase()})`
).join('\n');
