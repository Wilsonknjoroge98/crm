const mutualOfOmahaRates = require('./mutual_of_omaha.json');
const forestersRates = require('./foresters.json');
const ethosRates = require('./ethos.json');
const northAmericanRates = require('north_american.json');
const ameritasRates = require('./ameritas.json');
const americoRates = require('./americo.json');

const americanAmicableRates = require('./american_amicable.json');
const americanHomeLifeRates = require('./american_home_life.json');
const transamericaRates = require('./transamerica.json');
const royalNeighborsOfAmericaRates = require('./royal_neighbors_of_america.json');
const libertyBankersInsuranceGroupRates = require('./liberty_bankers_insurance_group.json');
const corebridgeRates = require('./corebridge.json');
const kansasCityLifeRates = require('./kansas_city_life.json');
const ladderRates = require('./ladder.json');
const nlgRates = require('./nlg.json');
const aetnaRates = require('./aetna.json');
const baltimoreLifeRates = require('./baltimore_life.json');
const combinedByChubbRates = require('./combined_by_chubb.json');
const illinoisMutualRates = require('./illinois_mutual.json');
const pekinLifeRates = require('./pekin_life.json');
const sbliRates = require('./sbli.json');

const PRODUCT_RATES = {
  'Mutual of Omaha': mutualOfOmahaRates,
  'Foresters': forestersRates,
  'Ethos': ethosRates,
  'North American': northAmericanRates,
  'Ameritas': ameritasRates,
  'Americo': americoRates,
  'American Amicable': americanAmicableRates,
  'American Home Life': americanHomeLifeRates,
  'Transamerica': transamericaRates,
  'Royal Neighbors of America': royalNeighborsOfAmericaRates,
  'Liberty Bankers Insurance Group': libertyBankersInsuranceGroupRates,
  'Corebridge': corebridgeRates,
  'Kansas City Life': kansasCityLifeRates,
  'Ladder': ladderRates,
  'NLG': nlgRates,
  'Aetna': aetnaRates,
  'Baltimore Life': baltimoreLifeRates,
  'Combined by Chubb': combinedByChubbRates,
  'Illinois Mutual': illinoisMutualRates,
  'Pekin Life': pekinLifeRates,
  'SBLI': sbliRates,
};

module.exports = PRODUCT_RATES;
