/* global describe, expect, test */
/* eslint-disable max-len */

const fs = require('fs');
const path = require('path');
const {
  BIO_MAX,
  BIO_PRESETS,
  bioProblem,
  normalizeBio,
  presetFor,
} = require('../shared/bio');

describe('producer page bio rules', () => {
  test('every preset is allowed and under the limit', () => {
    expect(BIO_PRESETS).toHaveLength(4);
    for (const preset of BIO_PRESETS) {
      expect(preset.text.length).toBeLessThanOrEqual(BIO_MAX);
      expect(bioProblem(preset.text)).toBeNull();
      expect(presetFor(preset.text)).toBe(preset);
    }
  });

  test('a preset is recognized with curly quotes and extra spaces', () => {
    const curly = `  ${BIO_PRESETS[1].text.replace(/'/g, '’')}  `;
    expect(presetFor(curly)).toBe(BIO_PRESETS[1]);
  });

  test('empty clears the bio', () => {
    expect(bioProblem('')).toBeNull();
    expect(normalizeBio('   ')).toBe('');
  });

  test.each([
    'Feel free to text me anytime. I love helping families find coverage that fits their budget.',
    'I treat every client like family and explain each option in plain English, with no pressure.',
    'I help homeowners and families protect the people they love, one honest conversation at a time.',
    'I serve families nationwide and explain every option in plain English with zero pressure at all.',
    'I make the whole process simple and stress-free, and I help you protect the people you love most.',
    'In my free time I coach my grandkids. At work I help families find coverage that fits their budget.',
    'I help you protect your family and your home without breaking the bank, one honest talk at a time.',
    'Licensed and approved in 30 states, I help North American families find coverage that fits them.',
    'My ethos is simple: listen first, explain every option clearly and let you decide what fits you.',
    'Licensed since 2015, I have helped over 1,000 families compare options and choose with confidence.',
    'Licensed since 2012. 300 families served and counting, and I treat every one like my own family.',
    'I have helped over 800 families protect what matters most and I would love to help yours too.',
    'Serving families from 2005-2025 with honest advice, plain English and zero pressure, every time.',
  ])('allows a normal custom bio: %s', (bio) => {
    expect(bioProblem(bio)).toBeNull();
  });

  test.each([
    ['too short', 'I help families.', /at least/],
    ['too long', 'I help families. '.repeat(15), /200 characters/],
    ['our brand', 'I work with Get Senior Quotes to help families find the coverage that fits their budget.', /company names/],
    ['our brand, short', 'Keyley agent helping families protect their homes and the people they love most.', /company names/],
    ['a carrier', 'I help families compare plans from carriers like Mutual of Omaha so they can choose well.', /company names/],
    ['guaranteed', 'I help families find guaranteed coverage that fits their budget, with no pressure at all.', /promises/],
    ['lowest rate', 'I shop dozens of companies so you always get the lowest rate on the coverage you need.', /promises/],
    ['best rate', 'I compare multiple companies so you get the best rate for your family and your budget.', /promises/],
    ['free', 'I offer a free review of your coverage and explain every option in plain English for you.', /promises/],
    ['no exam', 'Most of my clients get covered with no exam needed, and I make the whole process simple.', /health/],
    ['lender', 'I used to work at a bank as a loan officer and now help families protect their homes.', /lenders/],
    ['phone number', 'Call me at 555-123-4567 any time, I am happy to walk you through your options and plans.', /phone/],
    ['our brand, dashed', 'I am a proud FEX-Digital partner helping families protect the people they love most.', /company names/],
    ['our brand, dotted', 'As a G.S.Q. agent I help families protect the people they love, with no pressure at all.', /company names/],
    ['our brand, as a site', 'Find me on GetSeniorQuotes.com where I help families protect the people they love most.', /company names/],
    ['no-exam', 'Most of my clients qualify for no-exam coverage, and I make the whole process simple for you.', /health/],
    ['short link', 'See my reviews at janesmith.net and learn how I help families protect the people they love.', /links/],
    ['7-digit phone', 'Text me at 555-1234 anytime and I will help you compare options for your family today.', /phone/],
    ['vanity phone', 'Call 1-800-FLOWERS anytime and I will help you compare options for your family today.', /phone/],
    ['Colonial Penn', 'I write Colonial Penn and Aflac plans and help families choose the one that fits them.', /company names/],
    ['Foresters', 'As a Foresters agent I help families protect the people they love, with no pressure at all.', /company names/],
    ['approved', 'Everyone gets approved with me. I help families find coverage that fits their budget and needs.', /promises/],
    ['10-digit phone, spaced', 'Reach me at (555) 123 4567 and I will help you compare options for your family today.', /phone/],
    ['link', 'Visit www.example.com to learn more about how I help families protect the people they love.', /links/],
  ])('blocks %s', (_name, bio, reason) => {
    expect(bioProblem(bio)).toMatch(reason);
  });

  test('the client copy has the same presets and limits', () => {
    const client = fs.readFileSync(
      path.join(__dirname, '../../../client/src/utils/bio.js'),
      'utf8',
    );
    const server = fs.readFileSync(
      path.join(__dirname, '../shared/bio.js'),
      'utf8',
    );
    const body = (src) =>
      src
        .replace(/^\/\/.*$/gm, '')
        .replace(/^\/\* eslint-disable .*\*\/$/gm, '')
        .replace(/^export const /gm, 'const ')
        .replace(/module\.exports = \{[\s\S]*?\};\s*$/, '')
        .trim();
    expect(body(server)).toBe(body(client));
  });
});
