function showPage(id) {
  document.querySelectorAll('.page').forEach(page => page.style.display = 'none');
  document.getElementById(id).style.display = 'block';
  if (id === 'preferences') {
    renderTablePreferences();
  }
}

// Storage helpers
function saveToStorage(key, data) {
  localStorage.setItem(key, JSON.stringify(data));
}

function loadFromStorage(key) {
  const data = localStorage.getItem(key);
  return data ? JSON.parse(data) : null;
}

// === Initialization ===
let currentRoster = [];
let savedRoster = loadFromStorage('roster') || [];

let rawPrefs = loadFromStorage('preferences') || {};
let defaultNumTables = rawPrefs.numTables ?? 4;
let defaultStudentsPerTable = rawPrefs.studentsPerTable ?? 4;
let rawTableSettings = rawPrefs.tableSettings ?? [];

let tableSettings = [];
for (let i = 0; i < defaultNumTables; i++) {
  tableSettings[i] = rawTableSettings[i] || {
    name: `Table ${i + 1}`,
    color: '#f9f9f9'
  };
}

let savedPreferences = {
  numTables: defaultNumTables,
  studentsPerTable: defaultStudentsPerTable,
  tableSettings: tableSettings
};

// === CSV Import ===
document.getElementById('csvInput').addEventListener('change', function (e) {
  const file = e.target.files[0];
  const reader = new FileReader();
  reader.onload = function (event) {
    const lines = event.target.result.split('\n').map(line => line.trim()).filter(Boolean);
    const headers = lines[0].split(',').map(h => h.trim());

    const students = lines.slice(1).map(line => {
      const values = line.split(',').map(v => v.trim());
      const student = {};
      headers.forEach((h, i) => {
        student[h] = values[i] || '';
      });
      student["Full Name"] = `${student["First Name"] || ''} ${student["Last Name"] || ''}`.trim();
      return student;
    });

    currentRoster = students;
    renderRosterTable(currentRoster, headers);
  };
  reader.readAsText(file);
});

// === Roster Table ===
function renderRosterTable(data, headers) {
  const container = document.getElementById('roster-table');
  container.innerHTML = '';

  const table = document.createElement('table');
  const thead = document.createElement('thead');
  const headerRow = document.createElement('tr');
  headers.forEach(h => {
    const th = document.createElement('th');
    th.textContent = h;
    headerRow.appendChild(th);
  });
  thead.appendChild(headerRow);
  table.appendChild(thead);

  const tbody = document.createElement('tbody');
  data.forEach((student, rowIndex) => {
    const tr = document.createElement('tr');
    headers.forEach(h => {
      const td = document.createElement('td');
      const input = document.createElement('input');
      input.value = student[h] || '';
      input.oninput = (e) => {
        currentRoster[rowIndex][h] = e.target.value;
        if (h === "First Name" || h === "Last Name") {
          const first = currentRoster[rowIndex]["First Name"] || '';
          const last = currentRoster[rowIndex]["Last Name"] || '';
          currentRoster[rowIndex]["Full Name"] = `${first} ${last}`.trim();
        }
      };
      td.appendChild(input);
      tr.appendChild(td);
    });
    tbody.appendChild(tr);
  });

  table.appendChild(tbody);
  container.appendChild(table);
}

// === Save / Undo Roster ===
function saveRoster() {
  currentRoster.forEach(s => {
    s["Full Name"] = `${s["First Name"] || ''} ${s["Last Name"] || ''}`.trim();
  });
  savedRoster = JSON.parse(JSON.stringify(currentRoster));
  saveToStorage('roster', savedRoster);
  alert('Roster saved.');
}

function undoRosterChanges() {
  currentRoster = JSON.parse(JSON.stringify(savedRoster));
  const headers = Object.keys(currentRoster[0] || { "First Name": "", "Last Name": "" });
  renderRosterTable(currentRoster, headers);
}

// === Preferences ===
function savePreferences() {
  const numTables = parseInt(document.getElementById('numTables').value, 10);
  const studentsPerTable = parseInt(document.getElementById('studentsPerTable').value, 10);

  const newTableSettings = [];
  for (let i = 0; i < numTables; i++) {
    const name = document.getElementById(`table-name-${i}`)?.value || `Table ${i + 1}`;
    const color = document.getElementById(`table-color-${i}`)?.value || '#f9f9f9';
    newTableSettings.push({ name, color });
  }

  savedPreferences = {
    numTables,
    studentsPerTable,
    tableSettings: newTableSettings
  };

  saveToStorage('preferences', savedPreferences);
  alert('Preferences saved.');
}

// === Table Config UI ===
function renderTablePreferences() {
  const numTables = parseInt(document.getElementById('numTables').value, 10);
  const container = document.getElementById('classroom-config');
  container.innerHTML = '';

  const table = document.createElement('table');
  const thead = document.createElement('thead');
  thead.innerHTML = `<tr><th>Table</th><th>Name</th><th>Color</th></tr>`;
  table.appendChild(thead);

  const tbody = document.createElement('tbody');

  for (let i = 0; i < numTables; i++) {
    const tr = document.createElement('tr');

    const label = document.createElement('td');
    label.textContent = `Table ${i + 1}`;
    tr.appendChild(label);

    const nameInput = document.createElement('input');
    nameInput.type = 'text';
    nameInput.id = `table-name-${i}`;
    nameInput.value = savedPreferences.tableSettings[i]?.name || `Table ${i + 1}`;
    const nameTd = document.createElement('td');
    nameTd.appendChild(nameInput);
    tr.appendChild(nameTd);

    const colorInput = document.createElement('input');
    colorInput.type = 'color';
    colorInput.id = `table-color-${i}`;
    colorInput.value = savedPreferences.tableSettings[i]?.color || '#f9f9f9';
    const colorTd = document.createElement('td');
    colorTd.appendChild(colorInput);
    tr.appendChild(colorTd);

    tbody.appendChild(tr);
  }

  table.appendChild(tbody);
  container.appendChild(table);
}

// === Seating Chart ===
function generateSeatingChart() {
  const chartContainer = document.getElementById('chart-container');
  chartContainer.innerHTML = '';

  const students = loadFromStorage('roster') || [];
  const { numTables, studentsPerTable, tableSettings } = savedPreferences;

  if (!students.length) {
    alert("No students found. Please import and save a roster first.");
    return;
  }

  const shuffled = students.slice().sort(() => 0.5 - Math.random());
  
  let studentIndex = 0;
  let tableIndex = 0;
  let displayRow = 0;
  for (let r = 0; r < Math.ceil(numTables / 4); r++) {
	const rowDiv = document.createElement('div');
	rowDiv.className = 'row-container';
	
	let tablesInRow = (numTables - r*4);
	
	for (let t = 0; t < tablesInRow && t < 4; t++) {
		const tableDiv = document.createElement('div');
		tableDiv.className = 'table';
		tableDiv.style.backgroundColor = tableSettings[tableIndex]?.color || '#f9f9f9';

		const label = document.createElement('div');
		label.className = 'table-label';
		label.textContent = `Table ${tableIndex + 1}`;
		tableDiv.appendChild(label);

		for (let s = 0; s < studentsPerTable; s++) {
			const seatDiv = document.createElement('div');
			seatDiv.className = 'seat';
			seatDiv.id = `T${t + 1}-S${s + 1}`;
			
			const seatNumDiv = document.createElement('div');
			seatNumDiv.className = 'seat-num';
			seatNumDiv.textContent = `${s + 1}`
			

			const student = shuffled[studentIndex++];
			const seatNameDiv = document.createElement('div');
			seatNameDiv.className = 'seat-name';
			seatNameDiv.textContent = student ? student["Full Name"] || '' : '';
			seatDiv.appendChild(seatNumDiv);
			seatDiv.appendChild(seatNameDiv);
			tableDiv.appendChild(seatDiv);
		}
		tableIndex += 1
		rowDiv.appendChild(tableDiv)
    }
	
    chartContainer.appendChild(rowDiv);
  }
}
