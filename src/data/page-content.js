
export const pageContent = {
    cancellationPolicy: {
        title: "Block Cancellation Policy",
        rules: {
            fortyEightHour: {
                title: "48-Hour Rule",
                standard: "If you release a block 48 hours or more before the scheduled block time, a charge of 10% of the minimum block fee will be charged as a block release fee. However, if you release a block within 48 hours of the booked block time, the full block fee will be charged as a block cancellation fee.",
                noReleaseFee: "If you release a block within 48 hours of the scheduled block time, the full block fee will be charged as a block cancellation fee.",
                note: "Note: Please be informed that you can avoid the cancellation fee by providing a suitable substitute."
            },
            fees: {
                title: "Fees",
                standardRelease: "Release with 48+ hours' notice: 10% block release fee will be charged",
                standardCancellation: "Release with less than 48 hours' notice: Full block fee charged as a cancellation fee"
            },
            example: {
                title: "Example",
                blockDate: "Block Date: 16th January at 5:00 PM ({currency}50)",
                standard: {
                    releasedBefore: "Released before 14th January, 5:00 PM → {currency}5 charged as block release fee",
                    releasedAfter: "Released after 14th January, 5:00 PM → {currency}50 charged as cancellation fee"
                },
                noReleaseFee: {
                    releasedAfter: "Released after 14th January, 5:00 PM → {currency}50 charged as cancellation fee"
                }
            },
            whyMatters: {
                title: "Why This Matters",
                p1: "Releasing blocks early helps the team reassign the slot smoothly, ensuring customers receive consistent service, and it helps everyone avoid unnecessary delays.",
                p2: "Most partner drivers hold blocks in advance and release them close to the scheduled date, which limits availability for others.",
                p2SuffixStandard: " The 10% fee helps discourage last-minute releases and ensures fair access to blocks for all drivers."
            }
        }
    },
    feeStructure: {
        title: "Fee Structure",
        howPayWorks: {
            title: "How your pay works",
            description: "Clear minimums, predictable extras, and transparent examples.",
            points: [
                "Every delivery block (3, 4, or 5 hours) comes with a <strong>guaranteed minimum fee</strong>.",
                "Even if there are fewer tasks on a given day, you'll still receive this full minimum amount.",
                "If you complete more than the included number of tasks, you'll earn extra pay for each additional task — the busier it is, the more you earn.",
                "Only successfully completed tasks count toward your pay. Tasks that are failed or not delivered/picked up are not paid.",
                "<strong>Please be informed that the fee mentioned is inclusive of the mileage.</strong>"
            ]
        },
        examples: {
            title: "Examples by Density",
            subtitle: "See how minimum + extra tasks add up for different route densities.",
            labels: {
                minimumFee: "Minimum fee",
                includedTasks: "Included tasks",
                extraPerTask: "Extra per task",
                calculation: "If you complete <strong>{totalTasks} tasks</strong> ({extraTasks} extra × {currency}{additionalTaskFee}), your total becomes <strong class=\"text-brand-shadeYellow\">{currency}{totalEarnings}</strong>."
            }
        },
        whatToExpect: {
            title: "What to expect",
            guaranteed: { label: "Guaranteed minimum:", text: "You're always paid for the block you commit to." },
            extra: { label: "Extra earnings:", text: "More tasks = more pay." },
            hourly: { label: "Average hourly earnings:" },
            perTask: { label: "Average per-task earnings:" }
        },
        footer: "💡 You're always covered with a <strong>guaranteed minimum fee</strong> — and any extra work means extra income on top of that."
    },
    liabilities: {
        title: "Liability policy (lost/damaged)",
        paragraphs: [
            "Please note that if an order is lost or damaged while in your possession, you will be held responsible. For example, if an order is delivered to the wrong address, apartment, or customer and the items are lost, we may need to compensate the customer for the loss, and this cost will be passed on to you.",
            "Similarly, if any items are stolen or go missing during your route, you will be liable for the compensation. In addition, if an item is damaged due to negligence on your part and compensation is required, the related cost will also be passed on to you.",
            "Hence, we request all our partner drivers to be cautious while operating and to handle the orders with care to avoid any mishaps."
        ]
    },
    blocksClassification: {
        title: "Block densities",
        intro: "Our fee structure is designed to ensure fair compensation for our partner drivers by basing fees on tasks completed rather than on hourly rates. To better accommodate varying workloads, blocks are classified into:",
        table: {
            high: { label: "High Task Density", desc: "higher number of tasks with lower driving distance" },
            medium: { label: "Medium Task Density", desc: "balanced route of tasks and distance" },
            low: { label: "Low Task Density", desc: "lower number of tasks and higher driving distance" }
        },
        footer: [
            "Each block attracts a different guaranteed fee, along with a minimum number of tasks that need to be completed and a fee for any additional tasks.",
            "All details of the fee can be viewed in the Laundryheap Driver Application."
        ]
    },
    howRouteWorks: {
        title: "How Route Works",
        paragraphs: [
            "Please note that routes are planned by our automated system, which considers several factors such as live traffic conditions, the time required to find parking, and the estimated time needed to meet the customer and complete each task. Based on these parameters, the system calculates the estimated time of arrival (ETA) for completing the route.",
            "As Laundryheap operates as an on-demand service, new orders may be assigned to you while you are already on your route. These additional tasks are automatically planned to fit within your booked block time. Therefore, you will not have the option to decline any tasks added to your route."
        ]
    },
    smokingFitnessCheck: {
        title: "Smoking habits policy / Physical fitness check",
        smoking: {
            title: "Smoking habits policy",
            paragraphs: [
                "Please note that we strictly advise all partner drivers to handle customer orders with the utmost care. Smoking inside the vehicle is strictly prohibited, as it can cause the orders to absorb a smoke smell, which negatively affects the customer experience.",
                "If you feel the urge to smoke, please step outside the vehicle and ensure you are far enough away so that the smoke does not enter the vehicle from the outside.",
                "Also, please make sure to wash and sanitize your hands before you start your block.",
                "Kindly note that if we receive customer feedback regarding a smoke smell on the orders, the partner driver will be held liable for any compensation required. In addition, their access to the platform may be limited, as such incidents severely impact customer satisfaction and brand standards."
            ]
        },
        fitness: {
            title: "Physical fitness check",
            paragraphs: [
                "Please note that drivers may encounter situations where they need to climb stairs to deliver orders to different floors when elevator facilities are not available.",
                "We need to verify that you are physically capable of handling such situations without difficulty, as this is essential for completing deliveries to all customer locations."
            ],
            withdrawMessage: "If you cannot climb stairs, you will need to withdraw your application as this is a requirement for the role."
        }
    },
    paymentCycleSchedule: {
        title: "Payment Cycle & Block Schedule",
        config: {
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
        },
        sections: {
            paymentCycle: "Payment Cycle",
            scheduling: "Scheduling"
        }
    }
};

export const getPaymentCycleContent = (city) => {
    if (!city) return pageContent.paymentCycleSchedule.config.standard;

    const normalizedCity = city.trim();
    const config = pageContent.paymentCycleSchedule.config;

    // Check standard cities
    if (config.standard.cities.some(c => c.toLowerCase() === normalizedCity.toLowerCase())) {
        return config.standard;
    }

    // Check London
    if (config.london.cities.some(c => c.toLowerCase() === normalizedCity.toLowerCase())) {
        return config.london;
    }

    // Check USA cities
    if (config.usa.cities.some(c => c.toLowerCase() === normalizedCity.toLowerCase())) {
        return config.usa;
    }

    // Default to standard if no match found
    return config.standard;
};
