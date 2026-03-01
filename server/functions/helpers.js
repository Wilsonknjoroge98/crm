const {request} = require("axios");
const axios = require("axios");
const dayjs = require("dayjs");
const {PRODUCT_RATES, STATE_ABBREV_MAP} = require("./constants");
const crypto = require("crypto");
const getHyrosSource = async (email) => {
    const HYROS_BODY = {

        method: 'GET',

        url: 'https://api.hyros.com/v1/api/v1.0/leads',
        headers: {
            'Content-Type': 'application/json',
            'API-Key': process.env.HYROS_SECRET_KEY,
        },
        params: {
            emails: email,
        },
    };

    try {
        const response = await request(HYROS_BODY);
        const hyrosData = response.data.result[0] || [];


// THIS IS ALL WE NEED FOR THIS FUNCTION
// return hyrosData?.lastSource?.sourceLinkAd?.name ||
// hyrosData?.firstSource?.sourceLinkAd?.name || 'unknown'


        let source = hyrosData?.lastSource?.sourceLinkAd?.name || null;

        if (!source) {
            source = hyrosData?.firstSource?.sourceLinkAd?.name || null;

            if (!source) {
                source =
                    hyrosData.lastSource?.name ||
                    hyrosData.firstSource?.name ||
                    'unknown';
            }
        }

        return source;
    } catch (error) {
        console.error('Error fetching Hyros data:', error);
    }
};
const sendToGSQ = async (client) => {
    try {
        const BODY = {
            url: `${process.env.GSQ_BASE_URL}/sold`,
            headers: {
                Authorization: `Bearer ${process.env.GSQ_TOKEN}`,
            },
            method: 'POST',
            data: {
                email: client.email,
                phone: client.phone,
            },
        };
        const response = await axios.request(BODY);
        console.log('GSQ response:', response.data);
        return response.data;
    } catch (error) {
        console.error('Error sending mark lead sold:', error);
        throw error;
    }
};
const hash = (data) => {
    return `${crypto.createHash('sha256').update(data).digest('hex')}`;
};
const sendSaleToPixel = async (commission, lead, policy) => {
    if (!lead || !lead.email || !lead.name || !lead.phone || !lead.state) {
        console.error('Missing lead information');
        return;
    }

    if (!policy) {
        console.error('Missing policy information');
        return;
    }

    if (!policy.premiumAmount) {
        console.error('Missing policy premium amount');
        return;
    }

    if (!commission || commission <= 0) {
        console.error('Invalid commission amount');
        return;
    }

    const eventTime = Math.floor(Date.now() / 1000);

    const META_PURCHASE_PAYLOAD = {
        data: [
            {
                event_name: 'Purchase',
                event_time: eventTime,
                action_source: 'website',
                event_source_url: 'https://getseniorquotes.com',
                event_id: `purchase-${lead.email}-${eventTime}`,
                user_data: {
                    client_ip_address: lead.ip,
                    client_user_agent: lead.userAgent,
                    em: hash(lead.email),
                    fn: hash(lead.name.split(' ')[0]),
                    ln: hash(lead.name.split(' ')[1]),
                    ph: hash(lead.phone),
                    db: hash(`${lead.birthYear}${lead.birthMonth}${lead.birthDay}`),
                    country: hash('US'),
                    ge: lead.sex === 'Male' ? hash('m') : hash('f'),
                    st: hash(STATE_ABBREV_MAP[lead.state]),
                },
                custom_data: {
                    currency: 'USD',
                    value: commission,
                    content_type: 'product',
                    content_name: `${policy.carrier} - ${policy.policyType}`,
                    contents: [
                        {
                            id: `purchase-${lead.email}-${eventTime}`,
                            quantity: 1,
                            item_price: policy.premiumAmount * 12,
                        },
                    ],
                },
            },
        ],
    };

    // Attach click identifiers if available
    if (lead.fbc) META_PURCHASE_PAYLOAD.data[0].user_data.fbc = lead.fbc;
    if (lead.fbp) META_PURCHASE_PAYLOAD.data[0].user_data.fbp = lead.fbp;

    // Optional: add test_event_code for sandbox testing
    if (process.env.NODE_ENV === 'development') {
        META_PURCHASE_PAYLOAD.test_event_code = 'TEST12345';
    }

    try {
        const res = await axios.post(
            process.env.META_CONVERSIONS_URL,
            META_PURCHASE_PAYLOAD,
            {
                params: {
                    access_token: process.env.META_CONVERSIONS_TOKEN,
                },
                headers: {
                    'Content-Type': 'application/json',
                },
            },
        );

        console.log('Meta Purchase event sent:', res.data);
    } catch (err) {
        console.error(
            'Meta Purchase event error:',
            err.response?.data || err.message,
        );
    }
};
const calculateCommissions = async (agentData, agent, policy, premium) => {
    let sheaCommission = 0;

    const carrierRates = PRODUCT_RATES[policy.carrier?.trim()];
    const productRates = carrierRates?.[policy.policyType?.trim()];

    let agentLevel = await getLevel(agent, policy);
    if (!agentLevel) {
        agentLevel = agent.level;
    }

    let agentProductRate = getRate(productRates, agentLevel);

    if (!agentProductRate) {
        agentProductRate = 1;
    }

    const agentCommission = Math.round(premium * agentProductRate);

    console.log('agent commission:', {
        agent: agent.name,
        agentCommission,
        premium,
        agentProductRate,
    });

    if (agent.uid === process.env.SHEA_UID) {
        sheaCommission += agentCommission;
        console.log('Shea commission from sale:', agentCommission);
    }

    if (agent.uplineUid) {
        const upline = agentData.find((a) => a.uid === agent.uplineUid);

        if (!upline) {
            console.error('Upline not found for agent:', agent.uid, agent.name);
            return sheaCommission;
        }

        let uplineLevel = await getLevel(upline, policy);
        if (!uplineLevel) {
            uplineLevel = upline.level;
        }

        let uplineProductRate = getRate(productRates, uplineLevel);
        if (!uplineProductRate) {
            uplineProductRate = 1;
        }

        const uplineCommission = Math.round(
            premium * (uplineProductRate - agentProductRate),
        );
        if (upline.uid === process.env.SHEA_UID) {
            sheaCommission += uplineCommission;
            console.log('Shea commission from upline:', uplineCommission);
        }

        if (upline.uplineUid) {
            const secondUpline = agentData.find((a) => a.uid === upline.uplineUid);

            if (!secondUpline) {
                console.error(
                    'Second upline not found for agent:',
                    upline.uid,
                    upline.name,
                );
                return sheaCommission;
            }

            let secondUplineLevel = await getLevel(secondUpline, policy);
            if (!secondUplineLevel) {
                secondUplineLevel = secondUpline.level;
            }

            let secondUplineProductRate =
                productRates?.[String(secondUplineLevel)] / 100;
            if (!secondUplineProductRate) {
                secondUplineProductRate = 1;
            }

            const secondUplineCommission = Math.round(
                premium * (secondUplineProductRate - uplineProductRate),
            );

            if (secondUpline.uid === process.env.SHEA_UID) {
                sheaCommission += secondUplineCommission;
                console.log(
                    'Shea commission from second upline:',
                    secondUplineCommission,
                );
            }
        }
    }

    return sheaCommission;
};

function buildPolicySlackPayload({
                                     agentName,
                                     product,
                                     annualPremium,
                                     carrier,
                                     effectiveDate,
                                 }) {
    return {
        text: 'New GSQ Sale!',
        blocks: [
            {
                type: 'section',
                text: {
                    type: 'mrkdwn',
                    text: `
*🚨 POLICY SOLD 🚨*
Agent: ${agentName}
Product: ${product}
Carrier: ${carrier}
AP: $${Number(annualPremium).toLocaleString()}
EFT: ${effectiveDate || dayjs().format('MM/DD')}
          `.trim(),
                },
            },
            {
                type: 'divider',
            },
        ],
    };
}


// send sale to Hyros
const sendSaleToHyros = async (commission, client, policy) => {
    if (!client || !client.email || !client.phone) {
        console.error('Missing client information for Hyros');
        return;
    }

    if (!policy) {
        console.error('Missing policy information for Hyros');
        return;
    }

    if (!commission || commission <= 0) {
        console.error('Invalid commission amount for Hyros');
        return;
    }

    const HYROS_BODY = {
        method: 'POST',
        url: 'https://api.hyros.com/v1/api/v1.0/orders',
        headers: {
            'Content-Type': 'application/json',
            'API-Key': process.env.HYROS_SECRET_KEY,
        },
        data: {
            stage: 'Sale',
            phoneNumbers: [client.phone],
            email: client.email,
            items: [
                {
                    name: `${policy.carrier} - ${policy.policyType}`,
                    price: commission,
                    quantity: 1,
                },
            ],
        },
    };

    try {
        const hyrosResponse = await axios.request(HYROS_BODY);
        console.log('Hyros order created:', hyrosResponse.data);
    } catch (error) {
        console.error(
            'Error creating Hyros order:',
            error.response?.data || error.message,
        );
    }
};

const getRate = (productRates, level, defaultValue = 1) => {
    const raw = Number(productRates?.[String(level)]);
    return Number.isFinite(raw) && raw > 0 ? raw / 100 : defaultValue;
};
// const standardizeAddress = (address) => {


//   return address
//     .toLowerCase()
//     .split(/\s+/)
//     .map((part) => {
//       const idx = part.search(/[a-z]/i);
//       if (idx === -1) return part;
//       return part.slice(0, idx) + part[idx].toUpperCase() + part.slice(idx + 1);
//     })
//     .join(' ');
// };

// const toTitleCase = (str) =>
//   str
//     .toLowerCase()
//     .split(' ')
//     .filter(Boolean)
//     .map((word) => word[0].toUpperCase() + word.slice(1))
//     .join(' ');

// const updateAddresses = () => {
//   const firestore = new Firestore();

//   const policiesRef = firestore.collection('policies');
//   policiesRef.get().then((snapshot) => {
//     snapshot.forEach((doc) => {
//       console.log(`Updating address for policy ${doc.id}`);
//       const data = doc.data();

//       if (data?.contingentBeneficiaries?.length > 0) {
//         const standardizedBeneficiaries = data.contingentBeneficiaries.map(
//           (b) => ({
//             ...b,
//             firstName: toTitleCase(b.firstName),
//             lastName: toTitleCase(b.lastName),
//           }),
//         );
//         policiesRef
//           .doc(doc.id)
//           .update({ contingentBeneficiaries: standardizedBeneficiaries });
//       }
//     });
//   });
// };

// updateAddresses();

// app.get('/commissions', async (req, res) => {
//   const db = new Firestore();

//   const policySnapshot = await db.collection('policies').get();
//   const policies = policySnapshot.docs.map((doc) => doc.data());
//   const agentSnapshot = await db.collection('agents').get();
//   const agents = agentSnapshot.docs.map((doc) => doc.data());

//   const commissions = {};

//   for (const policy of policies) {
//     // skip if before July 15, 2025
//     const effectiveDate = policy.effectiveDate;

//     if (new Date(effectiveDate) < new Date('2025-07-15')) {
//       console.log('Skipping policy before 2025-07-15:', policy.policyNumber, effectiveDate);
//       continue;
//     }

//     // skip if after today
//     if (new Date(effectiveDate) > new Date()) {
//       console.log('Skipping policy after today:', policy.policyNumber, effectiveDate);
//       continue;
//     }

//     console.log('Processing policy:', {
//       carrier: policy.carrier,
//       policyType: policy.policyType,
//       policyNumber: policy.policyNumber,
//       agentIds: policy.agentIds,
//       premiumAmount: policy.premiumAmount,
//     });

//     const monthlyPremium = Math.round(Number(policy.premiumAmount)) || 0;
//     console.log('Monthly premium:', monthlyPremium);

//     const annualPremium = Math.round(monthlyPremium * 12);
//     console.log('Annual premium:', annualPremium);

//     const policyType = policy.policyType;
//     const policyCarrier = policy.carrier;

//     if (policy.splitPolicy && policy.agentIds.length === 2) {
//       console.log('Split policy detected');

//       const [agent1, agent2] = agents.filter((agent) => policy.agentIds.includes(agent.uid));

//       // TODO: there are cases where the write-in is not 50/50
//       const splitPremium = annualPremium / 2;
//       console.log('Split premium:', splitPremium);

//       const agent1Level = agent1.level;
//       const agent2Level = agent2.level;

//       const carrierRates = PRODUCT_RATES[policyCarrier?.trim()];
//       const productRates = carrierRates?.[policyType?.trim()];

//       let agent1ProductRate = productRates?.[String(agent1Level)] / 100;
//       let agent2ProductRate = productRates?.[String(agent2Level)] / 100;

//       if (!agent1ProductRate || !agent2ProductRate) {
//         console.error('Product rate calculation failed', {
//           policyCarrier,
//           policyType,
//           agent1Level,
//           agent2Level,
//         });

//         agent1ProductRate = 1;
//         agent2ProductRate = 1;
//       };

//       console.log(
//         `Computing ${policyCarrier} ${policyType} rate for agent 1:`,
//         agent1?.name,
//         'Level:',
//         agent1?.level,
//       );

//       console.log(
//         `Computing ${policyCarrier} ${policyType} rate for agent 2:`,
//         agent2?.name,
//         'Level:',
//         agent2?.level,
//       );

//       // split premium should use splitPolicy percentage
//       let agent1Commission = Math.round(splitPremium * agent1ProductRate);
//       let agent2Commission = Math.round(splitPremium * agent2ProductRate);

//       commissions[agent1.name] = (commissions[agent1.name] || 0) + agent1Commission;
//       console.log('Commission agent 1`:', agent1.name, agent1Commission);

//       commissions[agent2.name] = (commissions[agent2.name] || 0) + agent2Commission;
//       console.log('Commission agent 2:', agent2.name, agent2Commission);

//       console.log('Initial commissions:', {
//         agent1: { name: agent1.name, commission: agent1Commission },
//         agent2: { name: agent2.name, commission: agent2Commission },
//       });

//       if (agent1.uplineUid) {
//         const upline = agents.find((agent) => agent.uid === agent1.uplineUid);
//         const uplineProductRate = productRates?.[String(upline.level)] / 100

//         if (upline) {
//           console.log(`Found upline for agent 1: ${upline?.name}`);
//           const uplineCommission = Math.round(
//             annualPremium * (uplineProductRate - agent1ProductRate),
//           );

//           commissions[upline.name] = (commissions[upline.name] || 0) + uplineCommission;

//           console.log('Commission upline:', uplineCommission);

//           if (!upline.uplineUid) console.error('No upline found for agent 1', agent1.name);

//           if (upline.uplineUid) {
//             const secondUpline = agents.find((agent) => agent.uid === upline.uplineUid);
//             const secondUplineProductRate = productRates?.[String(secondUpline.level)] / 100

//             console.log(`Found upline for upline of agent 1: ${secondUpline?.name}`);
//             if (secondUpline) {
//               const secondUplineCommission = Math.round(
//                 annualPremium * (secondUplineProductRate - uplineProductRate),
//               );

//               commissions[secondUpline.name] =
//                 (commissions[secondUpline.name] || 0) + secondUplineCommission;

//               console.log('Commission 2nd upline:',secondUplineCommission);
//             }
//           }
//         }
//       }

//       if (agent2.uplineUid) {
//         const upline = agents.find((agent) => agent.uid === agent2.uplineUid);
//         const uplineProductRate = productRates?.[String(upline.level)] / 100

//         if (upline) {
//           console.log(`Found upline for agent 2: ${upline?.name}`);
//           const uplineCommission = Math.round(
//             annualPremium * (uplineProductRate - agent2ProductRate),
//           );

//           commissions[upline.name] = (commissions[upline.name] || 0) + uplineCommission;

//           console.log('Commission upline:', uplineCommission)

//           if (upline.uplineUid) {
//             const secondUpline = agents.find((agent) => agent.uid === upline.uplineUid);
//             const secondUplineProductRate = productRates?.[String(secondUpline.level)] / 100

//             console.log(`Found upline for upline of agent 2: ${secondUpline?.name}`);
//             if (secondUpline) {
//               const secondUplineCommission = Math.round(
//                 annualPremium * (secondUplineProductRate - uplineProductRate),
//               );

//               commissions[secondUpline.name] =
//                 (commissions[secondUpline.name] || 0) + secondUplineCommission;

//               console.log('Commission 2nd upline:',secondUplineCommission);
//             }
//         }
//       }
//     }
//       console.log('policy processed:', policy.policyNumber, agent1.name, agent2.name);
//     } else {
//       console.log('Single agent policy detected');
//       const agent = agents.find((a) => a.uid === policy.agentIds[0]);

//       const agentLevel = agent.level;

//       console.log(
//         `Computing ${policyCarrier} ${policyType} rate for agent:`,
//         agent?.name,
//         'Level:',
//         agentLevel,
//       );

//       const carrierRates = PRODUCT_RATES[policyCarrier?.trim()];
//       const productRates = carrierRates?.[policyType?.trim()];
//       const productRateValue = productRates?.[String(agentLevel)];
//       let agentProductRate = productRateValue / 100;

//       if (!agentProductRate) {
//         console.error('Single policy calculation failed', {
//           policyCarrier,
//           policyType,
//           agentLevel,
//         });
//         agentProductRate = 1;
//       }

//       let sellerCommission = Math.round(annualPremium * agentProductRate);
//       commissions[agent.name] = (commissions[agent.name] || 0) + sellerCommission;

//       if (agent.uplineUid) {
//         const upline = agents.find((a) => a.uid === agent.uplineUid);
//         const uplineProductRate = productRates?.[String(upline.level)] / 100;
//         console.log('Found upline for agent:', upline?.name);
//         if (upline) {
//           const uplineCommission = Math.round(annualPremium * (uplineProductRate - agentProductRate));

//           commissions[upline.name] = (commissions[upline.name] || 0) + uplineCommission;

//           if (upline.uplineUid) {
//             const secondUpline = agents.find((a) => a.uid === upline.uplineUid);
//             const secondUplineProductRate = productRates?.[String(secondUpline.level)] / 100

//             if (secondUpline) {
//                      console.log(`Found 2nd upline for agent: ${secondUpline?.name}`);
//               const secondUplineCommission = Math.round(
//                 annualPremium * (secondUplineProductRate - uplineProductRate),
//               );

//             commissions[secondUpline.name] = (commissions[secondUpline.name] || 0) + secondUplineCommission;

//             console.log('Commission 2nd upline:',secondUplineCommission);
//           }
//         }
//       }
//       console.log('policy processed:', policy.policyNumber, agent.name);
//     }
//   }
//   res.status(200).send(commissions);
// });
module.exports = { getHyrosSource, sendToGSQ, sendSaleToHyros, getRate, sendSaleToPixel, buildPolicySlackPayload };