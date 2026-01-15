const rock = require('./quiz_questions/rock_vault');
const pop = require('./quiz_questions/pop_vault');
const hiphop = require('./quiz_questions/hiphop_vault');
const eighties = require('./quiz_questions/eighties_vault');
const nineties = require('./quiz_questions/nineties_vault');
const indie = require('./quiz_questions/indie_vault');
const soul = require('./quiz_questions/soul_vault');
const electronic = require('./quiz_questions/electronic_vault');
const modern = require('./quiz_questions/modern_vault');
const metal = require('./quiz_questions/metal_vault');
const classic = require('./quiz_questions/classic_rock_vault');
const country = require('./quiz_questions/country_vault');
const rnb = require('./quiz_questions/rnb_vault');
const teenpop = require('./quiz_questions/teen_pop_vault');
const soundtracks = require('./quiz_questions/soundtrack_vault');
const punk = require('./quiz_questions/punk_vault');
const disco = require('./quiz_questions/disco_vault');
const onehits = require('./quiz_questions/one_hit_wonders_vault');
const yacht = require('./quiz_questions/yacht_rock_vault');
const eurodance = require('./quiz_questions/eurodance_vault');
const alt80s = require('./quiz_questions/alt_80s_vault');
const hiphop2 = require('./quiz_questions/hiphop_expansion_vault');
const emo = require('./quiz_questions/emo_vault');
const psych = require('./quiz_questions/psychedelic_vault');
const icons = require('./quiz_questions/pop_icons_vault');
const grunge2 = require('./quiz_questions/grunge_deep_vault');
const jazz = require('./quiz_questions/jazz_blues_vault');
const electronic2 = require('./quiz_questions/electronic_expansion_vault');
const modernIndie = require('./quiz_questions/modern_indie_vault');
const reggae = require('./quiz_questions/reggae_afro_vault');
const hairmetal = require('./quiz_questions/hair_metal_vault');
const girlgroups = require('./quiz_questions/girl_groups_vault');
const femalealt = require('./quiz_questions/female_alt_vault');
const indiesleaze = require('./quiz_questions/indie_sleaze_vault');
const visual = require('./quiz_questions/visual_trivia_vault'); // Added for Picture Rounds

module.exports = {
  tracks: [
    ...rock.tracks, 
    ...pop.tracks, 
    ...hiphop.tracks,
    ...eighties.tracks, 
    ...nineties.tracks, 
    ...indie.tracks,
    ...soul.tracks, 
    ...electronic.tracks, 
    ...modern.tracks,
    ...metal.tracks, 
    ...classic.tracks, 
    ...country.tracks,
    ...rnb.tracks, 
    ...teenpop.tracks, 
    ...soundtracks.tracks,
    ...punk.tracks, 
    ...disco.tracks, 
    ...onehits.tracks,
    ...yacht.tracks, 
    ...eurodance.tracks, 
    ...alt80s.tracks,
    ...hiphop2.tracks, 
    ...emo.tracks, 
    ...psych.tracks,
    ...icons.tracks, 
    ...grunge2.tracks, 
    ...jazz.tracks,
    ...electronic2.tracks, 
    ...modernIndie.tracks, 
    ...reggae.tracks,
    ...hairmetal.tracks, 
    ...girlgroups.tracks, 
    ...femalealt.tracks,
    ...indiesleaze.tracks,
    ...visual.tracks // Added for Picture Rounds
  ],
  templates: [
    { type: 'ARTIST', text: "Identify the artist performing this track.", points: 500 },
    { type: 'YEAR', text: "In what year was this track released?", points: 1000 }
  ]
};