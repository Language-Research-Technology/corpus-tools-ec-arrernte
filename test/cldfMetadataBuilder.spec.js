import { CLDFMetadataBuilder } from '../lib/cldf.js';
import assert from 'assert';

describe('CLDFMetadataBuilder', () => {
  it('should add tables and build metadata', () => {
    const builder = new CLDFMetadataBuilder();
    builder.addTable({
      url: 'words.csv',
      columns: [{ name: 'ID' }, { name: 'Form' }, { name: 'Gloss' }],
      primaryKey: 'ID',
    });

    const metadata = builder.build();
    assert.strictEqual(metadata['@context'], 'http://www.w3.org/ns/csvw');
    assert(Array.isArray(metadata.tables));
    assert.strictEqual(metadata.tables.length, 1);
    assert.strictEqual(metadata.tables[0].url, 'words.csv');
    assert.strictEqual(metadata.tables[0].tableSchema.primaryKey, 'ID');
    assert(Array.isArray(metadata.tables[0].tableSchema.columns));
    assert.strictEqual(metadata.tables[0].tableSchema.columns[0].name, 'ID');
  });

  it('should convert metadata to RDF', async () => {
    const builder = new CLDFMetadataBuilder();
    builder.addTable({
      url: 'words.csv',
      columns: [{ name: 'ID' }, { name: 'Form' }],
    });

    const rdf = await builder.toRDF();
    assert(typeof rdf === 'string');
    assert(rdf.includes('words.csv'));
  });

  it('should add foreign keys to table schema', () => {
    const builder = new CLDFMetadataBuilder();
    builder.addTable({
      url: 'words.csv',
      columns: [{ name: 'ID' }, { name: 'Form' }],
      foreignKeys: [
        {
          columnReference: 'ID',
          reference: {
            resource: 'other.csv',
            columnReference: 'ID',
          },
        },
      ],
    });

    const metadata = builder.build();
    assert(Array.isArray(metadata.tables[0].tableSchema.foreignKeys));
    assert.strictEqual(metadata.tables[0].tableSchema.foreignKeys.length, 1);
    assert.strictEqual(metadata.tables[0].tableSchema.foreignKeys[0].columnReference, 'ID');
    assert.strictEqual(metadata.tables[0].tableSchema.foreignKeys[0].reference.resource, 'other.csv');
  });
});

describe('cldfTablesToRoCrateEntities', () => {
  it('should return RO-Crate entities for CLDF tables and columns', () => {
    const builder = new CLDFMetadataBuilder();
    builder.addTable({
      url: 'words.csv',
      columns: [
        { name: 'ID', datatype: 'string', required: true },
        { name: 'Form', datatype: 'string' },
      ],
      primaryKey: 'ID',
      foreignKeys: [
        {
          columnReference: 'ID',
          reference: {
            resource: 'other.csv',
            columnReference: 'ID',
          },
        },
      ],
    });
    builder.build();
    const entities = builder.cldfTablesToRoCrateEntities();
    assert(Array.isArray(entities));
    // Should have 1 Dataset entity and 2 PropertyValue entities
    assert.strictEqual(entities.length, 3);

    // Check Dataset entity
    const dataset = entities.find((e) => e['@type'] === 'Dataset');
    assert(dataset);
    assert.strictEqual(dataset['@id'], 'words.csv');
    assert(Array.isArray(dataset.schema.columns));
    assert.strictEqual(dataset.schema.columns.length, 2);
    assert.strictEqual(dataset.schema.columns[0]['@id'], 'words.csv#ID');

    // Check PropertyValue entities
    const columnIds = dataset.schema.columns.map((col) => col['@id']);
    columnIds.forEach((colId) => {
      const colEntity = entities.find((e) => e['@id'] === colId);
      assert(colEntity);
      assert.strictEqual(colEntity['@type'], 'PropertyValue');
    });
  });
});
