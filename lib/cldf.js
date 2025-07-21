// cldf-metadata-builder.js
import jsonld from 'jsonld';

export class CLDFMetadataBuilder {
  constructor() {
    this.context = 'http://www.w3.org/ns/csvw'; // CSVW/JSON-LD context
    this.tables = [];
  }

  addTable({ url, columns, primaryKey = null, foreignKeys = [] }) {
    const tableSchema = {
      columns: columns.map((col) => ({
        name: col.name,
        datatype: col.datatype || 'string',
        ...col.otherProps,
      })),
    };

    if (primaryKey) {
      tableSchema.primaryKey = primaryKey;
    }

    if (foreignKeys.length > 0) {
      tableSchema.foreignKeys = foreignKeys;
    }

    this.tables.push({
      url,
      tableSchema,
    });
  }

  build() {
    return {
      '@context': this.context,
      tables: this.tables,
    };
  }

  async toRDF() {
    const compacted = this.build();
    return await jsonld.toRDF(compacted, { format: 'application/n-quads' });
  }

  /**
   * Converts CLDF metadata tables to RO-Crate entities.
   * Each table becomes a Dataset entity with a schema property listing its columns.
   */

  cldfTablesToRoCrateEntities() {
    if (!this.tables || !Array.isArray(this.tables)) return [];

    const entities = [];

    this.tables.forEach((table) => {
      // Create column entities
      const columnEntities = (table.tableSchema?.columns || []).map((col) => {
        const colId = `${table.url}#${col.name}`;
        return {
          '@id': colId,
          '@type': 'PropertyValue',
          name: col.name,
          datatype: typeof col.datatype === 'object' ? col.datatype.base || col.datatype : col.datatype,
          description: col['dc:description'] || '',
          propertyUrl: col.propertyUrl || '',
          required: col.required || false,
          titles: col.titles || '',
          separator: col.separator || undefined,
        };
      });

      // Add column entities to the entities array
      entities.push(...columnEntities);

      // Create the table entity (Dataset)
      entities.push({
        '@id': table.url,
        '@type': 'Dataset',
        name: table.url,
        schema: {
          columns: columnEntities.map((col) => ({ '@id': col['@id'] })),
        },
        primaryKey: table.tableSchema?.primaryKey || [],
        foreignKeys: table.tableSchema?.foreignKeys || [],
        conformsTo: table['dc:conformsTo'] || '',
        extent: table['dc:extent'] || undefined,
      });
    });

    return entities;
  }
}
