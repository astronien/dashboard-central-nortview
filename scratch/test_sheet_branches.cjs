const SHEET_URLS = {
  target: "https://docs.google.com/spreadsheets/d/18zsazWoy2DrItbc4c6FeVqD8X1DAUljdjBOG02lXM5I/gviz/tq?tqx=out:csv&gid=731299113",
  current: "https://docs.google.com/spreadsheets/d/1eVsLLW7xXV2nd633I0IS4zoQ6YxeQj8FJiqh5VXQCyU/gviz/tq?tqx=out:csv&gid=2048343587",
  lastMonth: "https://docs.google.com/spreadsheets/d/1ljPZiplQMv29Su_MRE0wPFPnnzy5w_yvkdi1EqqHr30/gviz/tq?tqx=out:csv&gid=120695055",
  lastYear: "https://docs.google.com/spreadsheets/d/16IK1QoGbrLAnzQjQUbpwwJ3dPoNDcFqRkwoR3kXYOMw/gviz/tq?tqx=out:csv&gid=1489791190"
};

function parseCSV(text) {
  const lines = [];
  let row = [""];
  let inQuotes = false;
  
  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    const nextChar = text[i + 1];
    
    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        row[row.length - 1] += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',') {
      if (inQuotes) {
        row[row.length - 1] += ',';
      } else {
        row.push('');
      }
    } else if (char === '\n' || char === '\r') {
      if (inQuotes) {
        row[row.length - 1] += char;
      } else {
        if (char === '\r' && nextChar === '\n') {
          i++;
        }
        lines.push(row);
        row = [''];
      }
    } else {
      row[row.length - 1] += char;
    }
  }
  if (row.length > 1 || row[0] !== '') {
    lines.push(row);
  }
  
  if (lines.length < 2) return [];
  const headers = lines[0].map(h => h.trim());
  const results = [];
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];
    if (line.length !== headers.length) continue;
    const obj = {};
    for (let j = 0; j < headers.length; j++) {
      obj[headers[j]] = line[j];
    }
    results.push(obj);
  }
  return results;
}

const cleanBranchForMatching = (val) => {
  if (!val) return "";
  let clean = String(val).toLowerCase();
  clean = clean.replace(/id\s*:?\s*\d+/g, "");
  clean = clean.replace(/istudio\s*by\s*spvi/g, "");
  clean = clean.replace(/istudio/g, "");
  clean = clean.replace(/studio\s*7/g, "");
  clean = clean.replace(/studio7/g, "");
  clean = clean.replace(/studio/g, "");
  clean = clean.replace(/spvi/g, "");
  clean = clean.replace(/uficon/g, "");
  clean = clean.replace(/copperwired/g, "");
  clean = clean.replace(/iserve/g, "");
  clean = clean.replace(/dotlife/g, "");
  clean = clean.replace(/banana\s*it/g, "");
  clean = clean.replace(/banana/g, "");
  clean = clean.replace(/plaza/g, "");
  clean = clean.replace(/[^a-z0-9ก-๙]/gi, "");
  return clean.trim();
};

async function check() {
  for (const [kind, url] of Object.entries(SHEET_URLS)) {
    console.log(`\n--- Fetching ${kind}...`);
    const res = await fetch(url);
    const text = await res.text();
    const rows = parseCSV(text);
    console.log(`Total rows in ${kind}: ${rows.length}`);
    if (rows.length > 0) {
      const sample = rows[0];
      console.log("Sample headers:", Object.keys(sample));
      
      const branchField = kind === "target" ? "BRANCH NAME" : "Branch (Name)";
      const distinctRaw = new Set();
      const distinctClean = new Set();
      
      for (const row of rows) {
        const val = row[branchField] || row.shop_name || row.emp_shop_code || "";
        if (val) {
          distinctRaw.add(val);
          distinctClean.add(`${val} -> ${cleanBranchForMatching(val)}`);
        }
      }
      
      console.log(`Distinct raw branches (up to 15):`, Array.from(distinctRaw).slice(0, 15));
      console.log(`Distinct clean branches (up to 15):`, Array.from(distinctClean).slice(0, 15));
    }
  }
}

check().catch(console.error);
