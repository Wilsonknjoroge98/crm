// const {request} = require("axios");
// const axios = require("axios");
// const dayjs = require("dayjs");
// const {PRODUCT_RATES, STATE_ABBREV_MAP} = require("./constants");
// const crypto = require("crypto");

// const calculateCommissions = async (agentData, agent, policy, premium) => {
//     let sheaCommission = 0;

//     const carrierRates = PRODUCT_RATES[policy.carrier?.trim()];
//     const productRates = carrierRates?.[policy.policyType?.trim()];

//     let agentLevel = await getLevel(agent, policy);
//     if (!agentLevel) {
//         agentLevel = agent.level;
//     }

//     let agentProductRate = getRate(productRates, agentLevel);

//     if (!agentProductRate) {
//         agentProductRate = 1;
//     }

//     const agentCommission = Math.round(premium * agentProductRate);

//     console.log('agent commission:', {
//         agent: agent.name,
//         agentCommission,
//         premium,
//         agentProductRate,
//     });

//     if (agent.uid === process.env.SHEA_UID) {
//         sheaCommission += agentCommission;
//         console.log('Shea commission from sale:', agentCommission);
//     }

//     if (agent.uplineUid) {
//         const upline = agentData.find((a) => a.uid === agent.uplineUid);

//         if (!upline) {
//             console.error('Upline not found for agent:', agent.uid, agent.name);
//             return sheaCommission;
//         }

//         let uplineLevel = await getLevel(upline, policy);
//         if (!uplineLevel) {
//             uplineLevel = upline.level;
//         }

//         let uplineProductRate = getRate(productRates, uplineLevel);
//         if (!uplineProductRate) {
//             uplineProductRate = 1;
//         }

//         const uplineCommission = Math.round(
//             premium * (uplineProductRate - agentProductRate),
//         );
//         if (upline.uid === process.env.SHEA_UID) {
//             sheaCommission += uplineCommission;
//             console.log('Shea commission from upline:', uplineCommission);
//         }

//         if (upline.uplineUid) {
//             const secondUpline = agentData.find((a) => a.uid === upline.uplineUid);

//             if (!secondUpline) {
//                 console.error(
//                     'Second upline not found for agent:',
//                     upline.uid,
//                     upline.name,
//                 );
//                 return sheaCommission;
//             }

//             let secondUplineLevel = await getLevel(secondUpline, policy);
//             if (!secondUplineLevel) {
//                 secondUplineLevel = secondUpline.level;
//             }

//             let secondUplineProductRate =
//                 productRates?.[String(secondUplineLevel)] / 100;
//             if (!secondUplineProductRate) {
//                 secondUplineProductRate = 1;
//             }

//             const secondUplineCommission = Math.round(
//                 premium * (secondUplineProductRate - uplineProductRate),
//             );

//             if (secondUpline.uid === process.env.SHEA_UID) {
//                 sheaCommission += secondUplineCommission;
//                 console.log(
//                     'Shea commission from second upline:',
//                     secondUplineCommission,
//                 );
//             }
//         }
//     }

//     return sheaCommission;
// };

// // send sale to Hyros

// const getRate = (productRates, level, defaultValue = 1) => {
//     const raw = Number(productRates?.[String(level)]);
//     return Number.isFinite(raw) && raw > 0 ? raw / 100 : defaultValue;
// };
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
module.exports = { getRate };
