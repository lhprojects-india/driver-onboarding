export const paymentCycleConfig = {
    standard: {
        cities: ["Birmingham", "Manchester", "Edinburgh", "Dublin", "Amsterdam", "Copenhagen", "Singapore"],
        paymentCycle: {
            text: "Payments are processed on a weekly basis. Fees for the blocks you operate in one week are paid in arrears the following week.",
            example: "For example, if you operate blocks between 1 January and 7 January, you will receive the payment breakdown in the following week (8 January to 14 January) by Wednesday, and the payment will be credited to your account between Friday or Monday end of the day."
        },
        scheduling: {
            text: "Blocks are published two weeks in advance. Every Monday at 10:00 AM, we release blocks for the upcoming week.",
            example: "For example, if 1st January falls on a Monday, blocks published on that day will be for the week of 15th January to 20th January.",
            note: "This advance scheduling helps you plan your availability and work schedule upfront."
        }
    },
    london: {
        cities: ["London"],
        paymentCycle: {
            text: "Payments are processed on a weekly basis. Fees for the blocks you operate in one week are paid in arrears the following week.",
            example: "For example, if you operate blocks between 1 January and 7 January, you will receive the payment breakdown in the following week (8 January to 14 January) by Wednesday, and the payment will be credited to your account between Friday or Monday end of the day."
        },
        scheduling: {
            text: "Please note that blocks are published 2 weeks in advance, and drivers can schedule their blocks accordingly. Blocks are released at 10:00 AM on the respective days as outlined below:",
            details: [
                "Vans: Sunday and Monday",
                "Cars: Tuesday and Wednesday"
            ]
        }
    },
    usa: {
        cities: ["New York", "Miami", "Boston", "Chicago"],
        paymentCycle: {
            text: "Payments are processed on a weekly basis. Fees for the blocks you operate in one week are paid in arrears the following week.",
            example: "For example, if you operate blocks between 1 January and 7 January, you will receive the payment breakdown in the following week (8 January to 14 January) by Wednesday, and the payment will be credited to your account between Friday or Monday end of the day."
        },
        scheduling: {
            text: "Blocks are published two weeks in advance. Every Monday at 12:00 PM, we release blocks for the upcoming week.",
            example: "For example, if 1st January falls on a Monday, blocks published on that day will be for the week of 15th January to 20th January.",
            note: "This advance scheduling helps you plan your availability and work schedule upfront."
        }
    }
};

export const getPaymentCycleContent = (city) => {
    if (!city) return paymentCycleConfig.standard;

    const normalizedCity = city.trim();

    // Check standard cities
    if (paymentCycleConfig.standard.cities.some(c => c.toLowerCase() === normalizedCity.toLowerCase())) {
        return paymentCycleConfig.standard;
    }

    // Check London
    if (paymentCycleConfig.london.cities.some(c => c.toLowerCase() === normalizedCity.toLowerCase())) {
        return paymentCycleConfig.london;
    }

    // Check USA cities
    if (paymentCycleConfig.usa.cities.some(c => c.toLowerCase() === normalizedCity.toLowerCase())) {
        return paymentCycleConfig.usa;
    }

    // Default to standard if no match found
    return paymentCycleConfig.standard;
};
