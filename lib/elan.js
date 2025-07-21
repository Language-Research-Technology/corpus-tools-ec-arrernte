const fs = require('fs');
const xml2js = require('xml2js');
const { CLDFMetadataBuilder } = require('./cldf');
const path = require('path');

class ElanParser {
  constructor(filePath) {
    this.filePath = filePath;
    this.data = null;
    this.alignableAnnotations = [];
  }

  async parse() {
    const xml = fs.readFileSync(this.filePath, 'utf8');
    const parser = new xml2js.Parser();
    this.data = await parser.parseStringPromise(xml);
    return this.data;
  }

  // Example: get all tiers
  getTiers() {
    if (!this.data) return [];
    return this.data.ANNOTATION_DOCUMENT.TIER || [];
  }

  /**
   * Creates an index of alignable annotations, pairing each with its transcript, translation, and label.
   * Returns an array of objects: { id, transcript, translation, label }
   * Now aligns label/transcript/translation by actual times, not just time slot references.
   */
  setAlignableAnnotationIndex() {
    if (!this.data) return [];

    const tiers = this.data.ANNOTATION_DOCUMENT.TIER || [];
    const timeSlotsArr = this.data.ANNOTATION_DOCUMENT.TIME_ORDER?.[0]?.TIME_SLOT || [];

    // Build a map from TIME_SLOT_ID to TIME_VALUE
    const timeSlotMap = {};
    timeSlotsArr.forEach((slot) => {
      timeSlotMap[slot.$.TIME_SLOT_ID] = slot.$.TIME_VALUE;
    });

    // Find transcript, translation, and labels tiers
    const transcriptTier = tiers.find((t) => t.$.TIER_ID === 'transcript');
    const translationTier = tiers.find((t) => t.$.TIER_ID === 'transcript-translation');
    const labelsTier = tiers.find((t) => t.$.TIER_ID === 'labels');

    if (!transcriptTier) return [];

    // Build a map of transcript annotations by id, including their time values
    const transcriptAnnotations = {};
    (transcriptTier.ANNOTATION || []).forEach((ann) => {
      const alignable = ann.ALIGNABLE_ANNOTATION && ann.ALIGNABLE_ANNOTATION[0];
      if (alignable) {
        const time1 = timeSlotMap[alignable.$.TIME_SLOT_REF1];
        const time2 = timeSlotMap[alignable.$.TIME_SLOT_REF2];
        transcriptAnnotations[alignable.$.ANNOTATION_ID] = {
          value: alignable.ANNOTATION_VALUE[0],
          time1,
          time2,
        };
      }
    });

    // Build a map of translations by annotation ref
    const translationAnnotations = {};
    if (translationTier) {
      (translationTier.ANNOTATION || []).forEach((ann) => {
        const refAnn = ann.REF_ANNOTATION && ann.REF_ANNOTATION[0];
        if (refAnn) {
          translationAnnotations[refAnn.$.ANNOTATION_REF] = refAnn.ANNOTATION_VALUE[0];
        }
      });
    }

    // Build a map of labels by their time values
    const labelAnnotations = {};
    if (labelsTier) {
      (labelsTier.ANNOTATION || []).forEach((ann) => {
        const alignable = ann.ALIGNABLE_ANNOTATION && ann.ALIGNABLE_ANNOTATION[0];
        if (alignable) {
          const time1 = timeSlotMap[alignable.$.TIME_SLOT_REF1];
          const time2 = timeSlotMap[alignable.$.TIME_SLOT_REF2];
          const key = `${time1}_${time2}`;
          labelAnnotations[key] = alignable.ANNOTATION_VALUE[0];
        }
      });
    }

    // Pair them together by matching time values
    this.alignableAnnotations = Object.keys(transcriptAnnotations).map((id) => {
      const tAnn = transcriptAnnotations[id];
      const labelKey = `${tAnn.time1}_${tAnn.time2}`;
      return {
        id,
        transcript: tAnn.value,
        translation: translationAnnotations[id] || null,
        label: labelAnnotations[labelKey] || null,
      };
    });
  }
  /**
   * Converts the alignableAnnotations array to CSV format.
   * @returns {string} CSV string with headers: id,transcript,translation,label
   */
  alignableAnnotationsToCSV() {
    if (!Array.isArray(this.alignableAnnotations) || this.alignableAnnotations.length === 0) {
      return 'id,transcript,translation,label';
    }
    const escape = (val) =>
      typeof val === 'string' ? `"${val.replace(/"/g, '""')}"` : val === null || val === undefined ? '' : String(val);

    const rows = this.alignableAnnotations.map((ann) =>
      [ann.id, ann.transcript, ann.translation, ann.label].map(escape).join(','),
    );
    return ['id,transcript,translation,label', ...rows].join('\n');
  }

  /**
   * Generates a cldf-metadata.json file for the CSV generated from alignableAnnotationsToCSV,
   * using the CLDFMetadataBuilder class.
   * @param {string} csvFilePath - Path to the CSV file.
   * @param {string} outputDir - Directory to write cldf-metadata.json.
   * @returns {string} Path to the generated cldf-metadata.json file.
   */
  generateCLDFMetadataWithBuilder(csvFilePath) {
    const builder = new CLDFMetadataBuilder();
    builder.addTable({
      url: path.basename(csvFilePath),
      columns: [
        { name: 'id', datatype: 'string', propertyUrl: 'http://cldf.clld.org/v1.0/terms.rdf#languageReference' },
        { name: 'transcript', datatype: 'string' },
        { name: 'translation', datatype: 'string' },
        { name: 'label', datatype: 'string' },
      ],
      primaryKey: 'id',
    });

    const metadata = builder.build();
    return metadata;
  }
}

module.exports = { ElanParser };
