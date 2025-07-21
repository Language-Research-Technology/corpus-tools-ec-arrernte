const path = require('path');
const { ElanParser } = require('../lib/elan');
const fs = require('fs');
const assert = require('assert');

describe('ElanParser', () => {
  const sampleEafPath = path.join(__dirname, 'sample.eaf');

  before(() => {
    // Create a minimal sample.eaf file for testing
    const sampleEafContent = `
      <ANNOTATION_DOCUMENT>
        <TIME_ORDER>
          <TIME_SLOT TIME_SLOT_ID="ts51" TIME_VALUE="468347"/>
          <TIME_SLOT TIME_SLOT_ID="ts52" TIME_VALUE="468347"/>
          <TIME_SLOT TIME_SLOT_ID="ts53" TIME_VALUE="469458"/>
          <TIME_SLOT TIME_SLOT_ID="ts54" TIME_VALUE="469458"/>
        </TIME_ORDER>
       <TIER LINGUISTIC_TYPE_REF="speech" TIER_ID="transcript">
        <ANNOTATION>
            <ALIGNABLE_ANNOTATION ANNOTATION_ID="a47" TIME_SLOT_REF1="ts51" TIME_SLOT_REF2="ts53">
                <ANNOTATION_VALUE>akaltye</ANNOTATION_VALUE>
            </ALIGNABLE_ANNOTATION>
        </ANNOTATION>
        </TIER>
        <TIER LINGUISTIC_TYPE_REF="translation" PARENT_REF="transcript" TIER_ID="transcript-translation">
                <ANNOTATION>
            <REF_ANNOTATION ANNOTATION_ID="a1637" ANNOTATION_REF="a47">
                <ANNOTATION_VALUE>knowledgable</ANNOTATION_VALUE>
            </REF_ANNOTATION>
        </ANNOTATION>
        </TIER>
        <TIER LINGUISTIC_TYPE_REF="speech" TIER_ID="labels">
                <ANNOTATION>
            <ALIGNABLE_ANNOTATION ANNOTATION_ID="a2065" TIME_SLOT_REF1="ts52" TIME_SLOT_REF2="ts54">
                <ANNOTATION_VALUE>ECA_akaltye03_WPP</ANNOTATION_VALUE>
            </ALIGNABLE_ANNOTATION>
        </ANNOTATION>
        </TIER>
      </ANNOTATION_DOCUMENT>
    `;
    fs.writeFileSync(sampleEafPath, sampleEafContent, 'utf8');
  });

  after(() => {
    // Clean up the sample file
    fs.unlinkSync(sampleEafPath);
  });

  it('parses an ELAN file and gets tiers', async () => {
    const parser = new ElanParser(sampleEafPath);
    await parser.parse();
    const tiers = parser.getTiers();
    assert(Array.isArray(tiers));
    assert(tiers.length > 0);
    assert.strictEqual(tiers[0].$.TIER_ID, 'transcript');
  });

  it('finds an alignable annotation in a tier and gets its translation', async () => {
    const parser = new ElanParser(sampleEafPath);
    await parser.parse();
    const alignableAnnotations = parser.getAlignableAnnotationIndex();
    assert(Array.isArray(alignableAnnotations));
    assert(alignableAnnotations.length > 0);

    const firstAnnotation = alignableAnnotations[0];
    assert.strictEqual(firstAnnotation.transcript, 'akaltye');
    assert.strictEqual(firstAnnotation.translation, 'knowledgable');
    assert.strictEqual(firstAnnotation.label, 'ECA_akaltye03_WPP');
  });
});
