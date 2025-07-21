const { Collector, generateArcpId, Provenance } = require('oni-ocfl');
const { languageProfileURI, Languages, Vocab } = require('language-data-commons-vocabs');

const fs = require('fs');
const path = require('path');
const xml2js = require('xml2js');
const { ElanParser } = require('./lib/elan');

async function main() {
  const collector = await Collector.create(); // Get all the paths etc from commandline
  // This is the main crate

  const corpusRepo = collector.newObject(collector.templateCrateDir);
  const corpusCrate = corpusRepo.crate;
  const repositoryObjects = [];
  let colCol;
  for (let item of corpusCrate.getGraph()) {
    const itemType = item['@type'];
    console.log(itemType);
    if (itemType.includes('RepositoryObject')) {
      repositoryObjects.push(item);
    }
    if (itemType.includes('RepositoryCollection')) {
      colCol = collector.newObject(collector.dataDir);
      colCol.mintArcpId();
      colCol.crate.root['@type'] = ['Dataset', 'RepositoryCollection'];
      colCol.crate.root['conformsTo'] = { '@id': languageProfileURI('Collection') };
      delete colCol.crate.root['pcdm:hasMember'];
      await colCol.addToRepo();
    }
  }

  for (let item of repositoryObjects) {
    const colObj = collector.newObject();
    const root = colObj.crate.root;
    root['@type'] = ['Dataset', 'RepositoryObject'];
    root['name'] = item['name'];
    root['description'] = item['description'];
    root['datePublished'] = convertToISODate(item['recordedAt']);
    root['license'] = item['license'];
    root['conformsTo'] = { '@id': languageProfileURI('Object') };
    root['pcdm:memberOf'] = { '@id': colCol.id };
    const curPath = item['@id'].replace('#', '');
    colObj.mintArcpId(curPath);
    const workspacePath = path.join(collector.dataDir, curPath);
    const folderContents = listFoldersContents(workspacePath);
    root['hasPart'] = [];

    // Loop through files in the root directory first
    if (folderContents.files && Array.isArray(folderContents.files)) {
      for (const file of folderContents.files) {
        if (file.endsWith('.DS_Store')) continue; // Skip .DS_Store files
        if (file.endsWith('.eaf')) {
          const filePath = path.join(workspacePath, file);
          const parser = new ElanParser(filePath);
          await parser.parse();
          parser.setAlignableAnnotationIndex();
          colObj.importFile(filePath, file, {
            '@type': ['File', 'ldac:PrimaryMaterial'],
          });
          const csvFilePath = filePath.replace('.eaf', '.csv');
          const csvData = parser.alignableAnnotationsToCSV();
          fs.writeFileSync(csvFilePath, csvData, 'utf8');
          colObj.importFile(csvFilePath, path.basename(csvFilePath), {
            '@type': ['File', 'ldac:DerivedMaterial'],
            'ldad:derivedFrom': path.basename(filePath),
          });
          const cldfFileData = parser.generateCLDFMetadataWithBuilder(path.basename(csvFilePath));
          fs.writeFileSync('cldf-metadata.json', JSON.stringify(cldfFileData, null, 2), 'utf8');
          colObj.importFile('cldf-metadata.json', 'cldf-metadata.json', {
            '@type': ['File', 'ldac:DerivedMaterial'],
            'ldad:derivedFrom': path.basename(filePath),
          });
        } else {
          colObj.importFile(path.join(workspacePath, file), file);
        }
      }
    }

    // Then loop through each directory and its contents
    for (const [folderName, contents] of Object.entries(folderContents.folders)) {
      if (folderName === 'files') continue; // skip the files key
      if (folderName.endsWith('_data')) {
        continue; // Not sure what to do with this folder, maybe zip it?
      } else {
        const files = contents.files || [];
        for (const file of files) {
          if (file.endsWith('.DS_Store')) continue; // Skip .DS_Store
          colObj.importFile(path.join(workspacePath, folderName, file), path.join(folderName, file));
        }
      }
    }
    colObj.mintArcpId(curPath); // Generate a new ARCP ID based on the current path
    await colObj.addToRepo();
  }
}

function listFoldersContents(dirPath) {
  const result = {
    folders: {},
    files: [],
  };
  const entries = fs.readdirSync(dirPath, { withFileTypes: true });
  for (const entry of entries) {
    if (entry.isDirectory()) {
      const folderPath = path.join(dirPath, entry.name);
      const folderEntries = fs.readdirSync(folderPath, { withFileTypes: true });
      result.folders[entry.name] = {
        folders: folderEntries.filter((e) => e.isDirectory()).map((e) => e.name),
        files: folderEntries.filter((e) => e.isFile()).map((e) => e.name),
      };
    } else if (entry.isFile()) {
      result.files.push(entry.name);
    }
  }
  return result;
}

function convertToISODate(input) {
  input = input[0] || '';
  if (typeof input !== 'string') {
    throw new Error('Input must be a string');
  }

  const parts = input.split('/');
  if (parts.length !== 3) {
    throw new Error('Invalid date format. Expected format: yyyy/mm/dd');
  }

  const [year, month, day] = parts;

  // Ensure all parts are two-digit padded if needed
  const isoDate = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;

  // Optional: Validate final date
  const isValid = !isNaN(new Date(isoDate).getTime());
  if (!isValid) {
    throw new Error('Invalid date');
  }

  return isoDate;
}

main();
