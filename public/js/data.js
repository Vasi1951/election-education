/**
 * Election Education — Data Module
 * 
 * Contains structured election process data used across the application.
 * Provides constants and lookup functions for election information.
 * 
 * @module data
 * @author Mamidi Vashisht
 */

/* exported ElectionData */
const ElectionData = (() => {
  'use strict';

  /** Voter eligibility requirements */
  const ELIGIBILITY = Object.freeze({
    minimumAge: 18,
    citizenshipRequired: true,
    registrationRequired: true,
    documentsNeeded: [
      'Voter ID Card (EPIC)',
      'Aadhaar Card',
      'Passport',
      'Driving License',
      'PAN Card',
      'Government-issued Photo ID'
    ]
  });

  /** Election phases data */
  const PHASES = Object.freeze([
    {
      id: 'announcement',
      phase: 1,
      title: 'Election Announcement',
      duration: 'Day 1',
      description: 'The Election Commission announces the election schedule and the Model Code of Conduct comes into effect immediately.',
      keyPoints: [
        'Schedule published in official gazette',
        'Model Code of Conduct activated',
        'Transfer of officials begins',
        'Voter rolls finalized'
      ]
    },
    {
      id: 'nomination',
      phase: 2,
      title: 'Nomination Filing',
      duration: 'Day 1–7',
      description: 'Candidates file their nomination papers with required documents and security deposit.',
      keyPoints: [
        'Nomination papers filed with Returning Officer',
        'Security deposit submitted',
        'Affidavit with criminal, financial, and educational details',
        'Scrutiny of nominations by officials'
      ]
    },
    {
      id: 'withdrawal',
      phase: 3,
      title: 'Withdrawal Period',
      duration: 'Day 8–10',
      description: 'Candidates may withdraw their nominations. Final list of contesting candidates published.',
      keyPoints: [
        'Candidates can withdraw nominations',
        'Final candidate list published',
        'Symbol allocation finalized',
        'Ballot order determined'
      ]
    },
    {
      id: 'campaign',
      phase: 4,
      title: 'Campaign Period',
      duration: 'Day 10–25',
      description: 'Candidates campaign through rallies, media, and door-to-door outreach within regulated guidelines.',
      keyPoints: [
        'Public rallies and meetings',
        'Media advertisements regulated',
        'Expenditure monitored',
        'Campaign stops 48 hours before polling'
      ]
    },
    {
      id: 'polling',
      phase: 5,
      title: 'Polling Day',
      duration: 'Day 27',
      description: 'Voters cast their ballots at assigned polling stations using EVMs with VVPAT verification.',
      keyPoints: [
        'Polling hours typically 7 AM to 6 PM',
        'Voter identity verified',
        'Indelible ink applied',
        'Secret ballot ensured'
      ]
    },
    {
      id: 'counting',
      phase: 6,
      title: 'Vote Counting',
      duration: 'Day 30',
      description: 'Sealed EVMs are opened and votes counted at designated centers with multi-party observation.',
      keyPoints: [
        'EVM strongrooms opened under supervision',
        'Postal ballots counted first',
        'Round-by-round results announced',
        'VVPAT verification as prescribed'
      ]
    },
    {
      id: 'formation',
      phase: 7,
      title: 'Government Formation',
      duration: 'Day 30+',
      description: 'The party or coalition with majority is invited to form the government and take oath.',
      keyPoints: [
        'Results officially declared',
        'Governor/President invites majority party',
        'Oath of office administered',
        'Cabinet ministers appointed'
      ]
    }
  ]);

  /** Types of elections */
  const ELECTION_TYPES = Object.freeze([
    { name: 'General Election', level: 'National', frequency: 'Every 5 years', description: 'Elects members to the national parliament.' },
    { name: 'State Election', level: 'State', frequency: 'Every 5 years', description: 'Elects members to state legislative assemblies.' },
    { name: 'Local Body Election', level: 'Local', frequency: 'Every 5 years', description: 'Elects municipal and panchayat representatives.' },
    { name: 'By-Election', level: 'Varies', frequency: 'As needed', description: 'Fills vacancies caused by resignation, death, or disqualification.' },
    { name: 'Referendum', level: 'National/State', frequency: 'As needed', description: 'Direct vote on specific policy issues.' }
  ]);

  /** Frequently asked questions */
  const FAQ = Object.freeze([
    { q: 'Who can vote?', a: 'Any citizen aged 18 or above on the qualifying date, who is registered as a voter in the electoral roll.' },
    { q: 'What is NOTA?', a: 'None of the Above — an option that allows voters to reject all candidates if they find none suitable.' },
    { q: 'What is EVM?', a: 'Electronic Voting Machine — a portable battery-operated device used to record votes electronically.' },
    { q: 'What is VVPAT?', a: 'Voter Verifiable Paper Audit Trail — prints a paper receipt of your vote for verification before it drops into a sealed box.' },
    { q: 'Can NRIs vote?', a: 'Yes, NRIs can register as overseas voters and vote in person at their registered constituency.' },
    { q: 'What is the Model Code of Conduct?', a: 'A set of guidelines issued by the Election Commission to ensure free and fair elections during the election period.' }
  ]);

  /**
   * Searches election data for matching content.
   * @param {string} query - Search query
   * @returns {Array} Matching results
   */
  function search(query) {
    if (!query || typeof query !== 'string') return [];
    const q = query.toLowerCase().trim();
    const results = [];

    // Search phases
    PHASES.forEach(phase => {
      if (phase.title.toLowerCase().includes(q) || phase.description.toLowerCase().includes(q)) {
        results.push({ type: 'phase', data: phase });
      }
    });

    // Search FAQ
    FAQ.forEach(faq => {
      if (faq.q.toLowerCase().includes(q) || faq.a.toLowerCase().includes(q)) {
        results.push({ type: 'faq', data: faq });
      }
    });

    return results;
  }

  return Object.freeze({
    ELIGIBILITY,
    PHASES,
    ELECTION_TYPES,
    FAQ,
    search
  });
})();
