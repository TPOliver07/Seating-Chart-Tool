// === Handles showing pages when a tab is clicked ===
function showPage(pageElementID) {
	/*
		pageElementID: page element to display
	*/
	document.querySelectorAll('.page').forEach(page => page.style.display = 'none'); // Get any open pages and close them
	document.getElementById(pageElementID).style.display = 'block'; // Display the active page
	if (pageElementID === 'preferences') renderTablePreferences(); // Handle showing preferences
	if (pageElementID === 'rosters' || pageElementID === 'seating-charts') renderRosterSelector(pageElementID); // Select roster
}

// === Storage Helpers ===
function saveToStorage(key, data) {
	/*
		Save or overwrite data in localStorage from persistent storage
			key: name of localStorage key
			data: JSON compatible data to be saved
	*/
	localStorage.setItem(key, JSON.stringify(data));
}

function loadFromStorage(key) {
	/*
		load data from localStorage for persistent storage
			key: name of localStorage key
			data: JSON compatible data to be saved
	*/
	const data = localStorage.getItem(key);
	return data ? JSON.parse(data) : null;
}

function getAllRosterNames() {
	/*
		More conveniently pull all roster names from local storage.
	*/
	return Object.keys(localStorage)
		.filter(k => k.startsWith('roster.'))
		.map(k => k.replace('roster.', ''));
}

function loadActiveRoster() {
	/*
		Get the active roster including headers and data then add them to the table.
	*/
	const data = loadFromStorage(`roster.${activeRosterName}`) || [];
	currentRoster = JSON.parse(JSON.stringify(data));
	const headers = Object.keys(currentRoster[0] || { "First Name": "", "Last Name": "" });
	renderRosterTable(currentRoster, headers, true);
}

// Initialize some things that need default values for the script to work
// === Roster State ===
let currentRoster = [];
let activeRosterName = getAllRosterNames()[0] || "Default";
let editable = false;

// === Preferences Initialization ===
let rawPrefs = loadFromStorage('preferences') || {};
let defaultNumTables = rawPrefs.numTables ?? 8;
let defaultStudentsPerTable = rawPrefs.studentsPerTable ?? 4;
let defaultMinStudentsPerTable = rawPrefs.minStudentsPerTable ?? 3;
let rawTableSettings = rawPrefs.tableSettings ?? [];

// Fill preferences for user
document.getElementById('numTables').value = defaultNumTables;
document.getElementById('studentsPerTable').value = defaultStudentsPerTable;
document.getElementById('minStudentsPerTable').value = defaultMinStudentsPerTable;

let tableSettings = [];
for (let i = 0; i < defaultNumTables; i++) {
	tableSettings[i] = rawTableSettings[i] || {
		name: `Table ${i + 1}`,
		color: '#f9f9f9'
	};
}

showPage('seating-charts');
loadActiveRoster();

let savedPreferences = {
	numTables: defaultNumTables,
	studentsPerTable: defaultStudentsPerTable,
	minStudentsPerTable: defaultMinStudentsPerTable,
	tableSettings: tableSettings
};

// === CSV Import ===
document.getElementById('csvInput').addEventListener('change', function (fileElement) {
	/*
		Pull a file from the csvInput then read each line into stored roster data.
	*/
	const file = fileElement.target.files[0];
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
		//student["Full Name"] = `${student["First Name"] || ''} ${student["Last Name"] || ''}`.trim();
		return student;
		});

		currentRoster = students;
		renderRosterTable(currentRoster, headers, true);
	};
	reader.readAsText(file);
});

// ... [existing code] remains unchanged above this point

// === Roster Table ===
function renderRosterTable(data, headers, editable) {
	/*
		Render the roster table to elements that are creaetd via Javascript in the roster-table container.
		Requires headers and data to fill the roster table with. 
	*/
	const container = document.getElementById('roster-table'); // Get container
	container.innerHTML = ''; // Clear container

	const table = document.createElement('table'); // Create a new table element
	table.id = "roster-edit-table"; // Name the table element
	const thead = document.createElement('thead'); // Create a new table head element
	const editTools = document.createElement('tr'); // Create a new table row for editing tools at the top of the table
	const headerRow = document.createElement('tr'); // Create a new table row element for headers
	
	// Handle table editing tools
	const editToolLabel = document.createElement('th'); // Table headers for removing and adding rows
	editToolLabel.textContent = "Edit...";
	editToolLabel.className = 'table-edit'; // Table editing tools must have this class in order to be hidden!
	editTools.appendChild(editToolLabel);
	
	
	// Return default table editing buttons that are nicely tucked into a td or tr element
	function editToolBtns(cellType, cellAddress, tools = ['remove','insert']) {
		/*
			cellType: HTML Element (usually 'tr' or 'td') that should be created to contain edit tools.
			cellAddress: string containing the row or column index prefixed by either "R-" or "C-" for rows and columns.
			tools: Array containing the needed tools in this table cell. Accepts strings:
				remove, insert
				Default: ['remove','insert']
				
			When cellType = 'th', added rows will be at the top and column names will be stored
		*/
		const tableEdit = document.createElement(cellType); // Table headers for removing and adding rows
		const splitCellAddress = cellAddress.split("-") // Contains whether this is a row or column in [0] and address in [1]
		tableEdit.className = 'table-edit'; // Table editing tools must have this class in order to be hidden!
		tools.forEach(tool => {
			if (tool == "remove") {
				const rowRemoveBtn = document.createElement('button');
				rowRemoveBtn.textContent = "Remove";
				if (splitCellAddress[0] == "R") {
					rowRemoveBtn.addEventListener("click", function() {removeRosterRow(splitCellAddress[1])});
				}
				else {
					rowRemoveBtn.addEventListener("click", function() {removeRosterColumn(splitCellAddress[1])});
				}
				rowRemoveBtn.className = "remove";
				tableEdit.appendChild(rowRemoveBtn);
			} 
			else if (tool == "insert") {
				const rowAddBtn = document.createElement('button');
				rowAddBtn.textContent = "Insert";
				if (splitCellAddress[0] == "R") {
					rowAddBtn.addEventListener("click", function() {insertRosterRow(splitCellAddress[1])});
				}
				else {
					rowAddBtn.addEventListener("click", function() {insertRosterColumn(splitCellAddress[1])});
				}
				rowAddBtn.className = "insert";
				tableEdit.appendChild(rowAddBtn);
			}
			else if (tool == "locked") {
				const lockedCell = document.createElement('div');
				lockedCell.innerHTML = '<p><i>Required</i></p>';
				lockedCell.className = "locked";
				tableEdit.appendChild(lockedCell);
			}
		});
		
		// For reliability, store location information in tableEdit. This means button pushes must pull data from the parent.
		// Store location in the ID as R-## or C-## for easy referencing and handling.
		tableEdit.id = cellAddress;
		return tableEdit; // Access tableEdit to to build buttons for table editing
	}
	
	// Fill empty cell with insert only tool to insert top cell
	headerRow.appendChild(editToolBtns('th', "R-0", ['insert']));
	headers.forEach(h => {
		// For each header, set the text content to the header data
		const th = document.createElement('th');
		th.textContent = h;
		th.className = 'table-display';
		headerRow.appendChild(th);
		if (h != "First Name" && h != "Last Name" && h != "Full Name") {
			editTools.appendChild(editToolBtns('th', "C-" + headers.indexOf(h)));
		}
		else if (h == "First Name") {
			editTools.appendChild(editToolBtns('th', "C-" + headers.indexOf(h), ['insert']));
		}
		else {
			editTools.appendChild(editToolBtns('th', "C-" + headers.indexOf(h), ['locked']));
		}
	});
	// Append each to the table for later addition to the container
	thead.appendChild(editTools);
	thead.appendChild(headerRow);
	table.appendChild(thead);

	const tbody = document.createElement('tbody'); // Create a new table body element
	data.forEach((student, rowIndex) => {
		// For each piece of data, fill the row
		const tr = document.createElement('tr');
		// There is absolutely a less hideous way to approach this, likely with a for loop that handles
		// building the cells for removing and adding... but I am lazy.
		/*const rowEdit = document.createElement('td'); // Table headers for removing and adding rows
		const rowRemoveBtn = document.createElement('button');
		const rowAddBtn = document.createElement('button');
		rowRemoveBtn.textContent = "Remove";
		rowAddBtn.textContent = "Insert";
		rowEdit.className = 'table-edit'; // Table editing tools must have this class in order to be hidden!
		rowEdit.appendChild(rowRemoveBtn);
		rowEdit.appendChild(rowAddBtn);*/
		tr.appendChild(editToolBtns('td', "R-" + (rowIndex+1)));
		
		headers.forEach(h => {
			// Fill out table cells
			const td = document.createElement('td');
			td.className = 'table-display';
			const input = document.createElement('input');
			input.value = student[h] || '';
			input.oninput = (e) => {
				currentRoster[rowIndex][h] = e.target.value;
				if (h === "First Name" || h === "Last Name") {
					const first = currentRoster[rowIndex]["First Name"] || '';
					const last = currentRoster[rowIndex]["Last Name"] || '';
					//currentRoster[rowIndex]["Full Name"] = `${first} ${last}`.trim();
				}
			};
			td.appendChild(input);
			tr.appendChild(td);
		});
		tbody.appendChild(tr);
	});

	table.appendChild(tbody);
	container.appendChild(table);
	
	editRoster("set");
}

function editRoster(mode) {
	/*
		Allow the user to edit the rosters rows and columns by making the dialogs visible. 
		This is usually used as a toggle function that accesses the CSS variable edit-tools-display, 
		but can also be used to loop through elements when the roster is loaded without resetting the value.
		Arguments:
			mode (String): "toggle" or "set"
				toggle: get the value of editable and flip the state of display and editable
				set: get the value of editable and assign it to the display of elements
	*/
	let tableCells = document.getElementsByClassName('table-edit')
	let displayType = "none"; // Default to none
	
	if (editable == true && mode == "toggle") {
		// Toggle to false
		editable = false;
	} else if (editable == false && mode == "toggle") {
		// Toggle to true
		editable = true;
		displayType = "table-cell";
	} else if (editable == true && mode == "set") {
		// Set to display true
		displayType = "table-cell";
	} else {
		// In all other cases, display should be false
		editable = false;
	}
	for (let i = 0; i < tableCells.length; i++) {
		tableCells[i].style.display = displayType;
	}
}

// === Add Row ===
function insertRosterRow(rowAddress) {
	/*
		Add a new roster row in the current roster at a specified location.
		Row is added at a specific location:
			rowAddress (int): from formatted string to be handled to accurately place the row
	*/
	if (!currentRoster.length) return;
	const newRow = {};
	Object.keys(currentRoster[0]).forEach(key => {
		newRow[key] = '';
	});
	currentRoster.splice(rowAddress, 0 ,newRow);
	renderRosterTable(currentRoster, Object.keys(currentRoster[0]), true);
}

// === Remove Row ===
function removeRosterRow(rowAddress) {
	// Remove a roster row from the specified address
	currentRoster.splice(rowAddress - 1, 1);
	renderRosterTable(currentRoster, Object.keys(currentRoster[0]), true);
}

function insertRosterColumn(columnAddress) {
	/*
		Add a new roster column in the current roster at a specified location.
		Column is added at a specific location:
			columnAddress (int): from formatted string to be handled to accurately place the column
	*/
	const newKey = prompt("Enter new column name:");
	if (!newKey) return;
	currentRoster.forEach(row => {
		let entries = Object.entries(row);
		entries.splice(columnAddress+1, 0, [newKey, '']);
		currentRoster[currentRoster.indexOf(row)] = Object.fromEntries(entries);
	});

	let headers = Object.keys(currentRoster[0]);
	headers.splice(columnAddress+1, 0, newKey);
	renderRosterTable(currentRoster, Object.keys(currentRoster[0]), true);
}

function removeRosterColumn(columnAddress) {
	// Remove a roster column from the specified address
	currentRoster.forEach(row => {
		let entries = Object.entries(row);
		entries.splice(columnAddress, 1);
		currentRoster[currentRoster.indexOf(row)] = Object.fromEntries(entries);
	});
	renderRosterTable(currentRoster, Object.keys(currentRoster[0]), true);
}

// === Save / Rename / Undo ===
function saveRoster() {
	
	// This can be used to save full names. There is really no need.
	/*currentRoster.forEach(student => { 
		// Loop through and obtain data from each student
		s["Full Name"] = `${s["First Name"] || ''} ${s["Last Name"] || ''}`.trim();
	});*/
	// Save to local storage
	saveToStorage(`roster.${activeRosterName}`, currentRoster);
	// A cleaner system than just alerts should be created
	alert(`Roster "${activeRosterName}" saved.`);
}

function saveRosterAsNew() {
	// Save the roster after asking the user to prompt for a name
	// A dialog other than prompt would be helpful here
	const newName = prompt("Enter a name for the new roster:");
	if (!newName) return;
	activeRosterName = newName;
	saveRoster();
	renderRosterSelector();
}

function renameRoster() {
	/*
		Load the old roster and save over that roster with a new name obtained from user input.
	*/
	const newName = prompt("Enter a new name for this roster:", activeRosterName);
	if (!newName || newName === activeRosterName) return;
	const oldData = loadFromStorage(`roster.${activeRosterName}`);
	if (!oldData) return alert("No data found to rename.");
	saveToStorage(`roster.${newName}`, oldData);
	localStorage.removeItem(`roster.${activeRosterName}`);
	activeRosterName = newName;
	renderRosterSelector();
	alert("Roster renamed.");
}

function undoRosterChanges() {
	// Just reload the old roster... not so complex
	loadActiveRoster();
}

// === Delete Roster ===
function deleteRoster() {
	/*
		Prompt the user, then remove the specified roster from localStorage.
	*/
	const confirmDelete = confirm(`Are you sure you want to delete "${activeRosterName}"?`);
	if (!confirmDelete) return;
	localStorage.removeItem(`roster.${activeRosterName}`);

	// Avoid leaving behind no active roster as this causes issues
	const remaining = getAllRosterNames();
	activeRosterName = remaining.length ? remaining[0] : "Default";
	if (!remaining.length) {
		saveToStorage(`roster.${activeRosterName}`, []);
	}
	loadActiveRoster(); // Reload roster data using default
	renderRosterSelector();
}

// === Download Seating Chart as Image ===
function downloadChartImage() {
	// Use html2canvas to download the chart-container element as a PNG image and save to the users computer
	const chart = document.getElementById("chart-container");
	const chartWidth = chart.style.width;
	const chartHeight = chart.style.height;
	chart.style.width = '1920px';
	chart.style.height = '1080px';
	
	// Change roster label font size
	const rosterLabel = document.getElementById('roster-label');
	rosterLabel.style.fontSize = "3em";
	// Loop through and edit each table row container height
	const rowContainers = document.getElementsByClassName('row-container');
	const { studentsPerTable } = savedPreferences;
	let rowHeight = Math.floor((880)/rowContainers.length);
	if (rowHeight > 440) {
		rowHeight = 440; // Set a maximum
	}
	console.log(rowHeight);
	for (let i = 0; i < rowContainers.length; i++) {
		rowContainers[i].style.height = `${rowHeight}px`;
	}
	// Loop through various font containers and make fonts larger
	let fontAdjustments = [ // 2D array to simplify looping through font adjustments both ways
		['seat-name', document.getElementsByClassName('seat-name')[0].style.fontSize, `${rowHeight*(0.125/Math.ceil(studentsPerTable/2))}px`], 
		['seat-num', document.getElementsByClassName('seat-num')[0].style.fontSize, `${rowHeight*(0.125/Math.ceil(studentsPerTable/2))}px`],
		['table-label', document.getElementsByClassName('table-label')[0].style.fontSize, "36px"]
	];
	
	console.log(fontAdjustments);
	fontAdjustments.forEach(fontConfig => {
		let fontElements = document.getElementsByClassName(fontConfig[0]);
		for (let j = 0; j < fontElements.length; j++) {
			fontElements[j].style.fontSize = fontConfig[2];
		}
	});
	if (!chart) return;
	html2canvas(chart).then(canvas => {
		const link = document.createElement('a');
		link.download = `${activeRosterName}_seating_chart.png`;
		link.href = canvas.toDataURL();
		link.click();
	});
	// Reset all style changes
	chart.style.width = chartWidth;
	chart.style.height = chartHeight;
	rosterLabel.style.fontSize = "";
	for (let i = 0; i < rowContainers.length; i++) {
		rowContainers[i].style.height = "auto";
	}
	fontAdjustments.forEach(fontConfig => {
		let fontElements = document.getElementsByClassName(fontConfig[0]);
		for (let j = 0; j < fontElements.length; j++) {
			fontElements[j].style.fontSize = fontConfig[1];
		}
	});
}

function savePreferences() {
  const numTables = parseInt(document.getElementById('numTables').value, 10);
  const studentsPerTable = parseInt(document.getElementById('studentsPerTable').value, 10);
  const minStudentsPerTable = parseInt(document.getElementById('minStudentsPerTable').value, 10);

  const newTableSettings = [];
  for (let i = 0; i < 40; i++) { // Go to 40 rather than numTables to avoid losing preferences when modifying tables
    const name = document.getElementById(`table-name-${i}`)?.value || `Table ${i + 1}`;
    const color = document.getElementById(`table-color-${i}`)?.value || '#f9f9f9';
    newTableSettings.push({ name, color });
  }

  savedPreferences = {
    numTables,
    studentsPerTable,
	minStudentsPerTable,
    tableSettings: newTableSettings
  };

  saveToStorage('preferences', savedPreferences);
  renderTablePreferences();
  alert('Preferences saved.');
}

function renderTablePreferences(mode = 'load') {
	console.log(`Running renderer with mode '${mode}'`);
	if (mode == 'reset') {
		let userConfirmation = prompt("This will reset all of your table settings! Are you sure you want to do this?\n\nType 'reset' to reset table settings.");
		if (userConfirmation != 'reset') {
			return console.log("User aborted reset");
		}
	}
	
	const numTables = parseInt(document.getElementById('numTables').value, 10);
	const container = document.getElementById('classroom-config');
	container.innerHTML = '';

	const table = document.createElement('table');
	const thead = document.createElement('thead');
	thead.innerHTML = `<tr><th>Table</th><th>Name</th><th>Color</th></tr>`;
	table.appendChild(thead);

	const tbody = document.createElement('tbody');

	for (let i = 0; i < 40; i++) { // Go to 40 rather than numTables to avoid losing preferences when numTables is modified
		const tr = document.createElement('tr');

		const label = document.createElement('td');
		label.textContent = `Table ${i + 1}`;
		tr.appendChild(label);

		const nameInput = document.createElement('input');
		nameInput.type = 'text';
		nameInput.id = `table-name-${i}`;
		if (mode == 'load') {
			nameInput.value = savedPreferences.tableSettings[i]?.name || `Table ${i + 1}`;
		} else if (mode == 'reset') {
			nameInput.value = `Table ${i + 1}`;
		}
		const nameTd = document.createElement('td');
		nameTd.appendChild(nameInput);
		tr.appendChild(nameTd);

		const colorInput = document.createElement('input');
		colorInput.type = 'color';
		colorInput.id = `table-color-${i}`;
		if (mode == 'load') {
			colorInput.value = savedPreferences.tableSettings[i]?.color || '#f9f9f9';
		} else if (mode == 'reset') {
			colorInput.value = '#f9f9f9';
		}
		
		const colorTd = document.createElement('td');
		colorTd.appendChild(colorInput);
		tr.appendChild(colorTd);
		// If greater than the number of tables, hide this tr
		if (i >= numTables) {
			tr.style.display = 'none';
		}


		tbody.appendChild(tr);
	}

	table.appendChild(tbody);
	container.appendChild(table);
}

// === Seating Chart ===
function generateSeatingChart() {
	/*
		-- The meat -- 
		This script handles generating a unique random seating chart. Currently this seating
		chart is entirely random, but this script needs to also have the capability to handle
		grouping based on data stored in other columns to accomplish ability grouping and 
		other relevant tasks. This function builds out HTML elements for the chart based
		on data the user has input into preferences and rosters. 
	*/
	const chartContainer = document.getElementById('chart-container');
	const rosterLabel = document.createElement('h1');
	rosterLabel.id = "roster-label";
	rosterLabel.textContent = `${activeRosterName} Seating Chart`;
	chartContainer.innerHTML = '';
	chartContainer.appendChild(rosterLabel)

	const students = loadFromStorage(`roster.${activeRosterName}`) || [];
	const { numTables, studentsPerTable, minStudentsPerTable, tableSettings } = savedPreferences;

	if (!students.length) {
		alert("No students found. Please import and save a roster first.");
		return;
	}

	const shuffled = students.slice().sort(() => 0.5 - Math.random()); // Shuffle the full student list
	
	// Get grouping information	
	const groupingColumn = document.getElementById("grouping-column-dropdown").value;
	const groupingType = document.getElementById("grouping-type-dropdown").value;
	let attributes = [];
	let attributeSubgroups = {}; // Empty dictionary that will be filled with rows containing students who are within a sub group
	let subgroupSizes = {}; // Empty dictionary that will be filled with integer sizes of each group BEFORE handling
	
	// Only continue further if column does not equal none
	if (groupingColumn != "None") {
		// Use grouping information to create subgroups from shuffled
		// Determine what attributes are present by looping
		
		shuffled.forEach(row => { // Get all attributes
			attributes.push(row[groupingColumn]);
		});
		attributes = [... new Set(attributes)] // Get the set with no duplicates
		
		
		attributes.forEach(attribute => {
			// Once for each attribute, loop through the list and pull and students that fit into the thisSubgroup array
			let thisSubgroup = [];
			for (let i = 0; i < currentRoster.length; i++) {
				if (currentRoster[i][groupingColumn] == attribute) {
					thisSubgroup.push(currentRoster[i]);
				}
			}
			// Also shuffle the subgroup
			thisSubgroup = thisSubgroup.slice().sort(() => 0.5 - Math.random());
			
			attributeSubgroups[attribute] = thisSubgroup;
			subgroupSizes[attribute] = thisSubgroup.length;
			
		});
	}
	
	console.log(subgroupSizes);
	let studentIndex = 0;
	let tableIndex = 0;
	let displayRow = 0;
	let groupingIndex = Math.floor(Math.random()*2); // Group to start filling from. This begins as a random integer to ensure the same groups are not always in the same seat
	let thisGroupIndex = 0; // Keep track of students in a sequence are from the same group for even distribution
	for (let r = 0; r < Math.ceil(numTables / 4); r++) {
	const rowDiv = document.createElement('div');
	rowDiv.className = 'row-container';
	
	let tablesInRow = (numTables - r*4);
	let maxStudentsPerTable = studentsPerTable;
	
	for (let t = 0; t < tablesInRow && t < 4 && studentIndex < students.length && tableIndex < numTables; t++) {
		const tableDiv = document.createElement('div');
		tableDiv.className = 'table';
		tableDiv.style.backgroundColor = tableSettings[tableIndex]?.color || '#f9f9f9';

		const labelFlexbox = document.createElement('div');
		const label = document.createElement('div');
		labelFlexbox.className = 'table-label';
		label.textContent = tableSettings[tableIndex]?.name || `Table ${tableIndex + 1}`;
		labelFlexbox.appendChild(label)
		tableDiv.appendChild(labelFlexbox);
		
		let seatIndex = 0
		// Need logic that can handle pushing partially filled tables to the end reliably
		// Make group sizes smaller by one until either minimum group is met or all tables are filled.
		if ((students.length-studentIndex)%maxStudentsPerTable != 0) { // Current student number is not divisible by 4
			// Compare the expected number of tables to the students remaining
			if (Math.ceil(students.length/maxStudentsPerTable)-tableIndex <= (maxStudentsPerTable-(students.length-studentIndex)%maxStudentsPerTable)) {
				// If the tables remaining is less than or equal to students to place at minimum group size, start using smaller group size.
				maxStudentsPerTable = maxStudentsPerTable - 1;
				if (maxStudentsPerTable < minStudentsPerTable) {
					// Do not go smaller than the minimum
					maxStudentsPerTable = minStudentsPerTable;
				}
			}	
		}
		
		

		for (let s = 0; s < maxStudentsPerTable; s++) {
			const seatRowDiv = document.createElement('div');
			seatRowDiv.className = 'table-row-container'
			
			let seatsInRow = (maxStudentsPerTable - s*2);
			
			for (let seatRow = 0; seatRow < 2 && seatRow < seatsInRow; seatRow++) {
				const seatDiv = document.createElement('div');
				seatDiv.className = 'seat';
				seatDiv.id = `T${t + 1}-S${s + 1}`;
				
				const seatNumDiv = document.createElement('div');
				seatNumDiv.className = 'seat-num';
				seatNumDiv.textContent = `${seatIndex + 1}`;
				
				// Logic to handle grouping when grouping is true
				let student;
				if (groupingColumn != "None") {
					if (groupingType == "Mixed") {
						/* 
						Make a decision based on proportion of remaining students as to what group to pull from.
						Get the remaining number of students in this group and compare to the number of full tables remaining
						to be filled. Use this number to determine whether to continue filling or avoid filling from this group.
						*/
						let tablesRemaining = Math.floor((students.length - studentIndex)/studentsPerTable);
						if (thisGroupIndex > (attributeSubgroups[attributes[groupingIndex]].length/tablesRemaining - 1)) {
							groupingIndex += 1;
							thisGroupIndex = 0;
						} else {thisGroupIndex += 1;}
						if (groupingIndex >= attributes.length) {groupingIndex = 0;} // Wrap back to 0
						// Erase elements from each group array after they are assigned
						// This may cause the arrays to be empty when ready for access
						// At this point a suitable student has been found
						student = attributeSubgroups[attributes[groupingIndex]][0];
						if (student == undefined) { // Index is out of bounds because the list is empty... move to next group
							let searchingForStudent = true;
							let searches = 0;
							while (student == undefined && searches < (attributes.length*2)) { // Searches is greater than the attributes length because this mysteriously fixes the problem...
								// Loop through groupingIndex until a student is found
								groupingIndex += 1;
								if (groupingIndex >= attributes.length) {groupingIndex = 0;} // Wrap back to 0
								if (attributeSubgroups[attributes[groupingIndex]] != undefined) {
									student = attributeSubgroups[attributes[groupingIndex]][0]
									searchingForStudent = false;
								}
								searches += 1;
							}
						}
						
						// Write to the log when a student is still undefined for any reason
						if (student == undefined) {
							console.log(`Student at seat T${t + 1}-S${s + 1} is undefined after searching for a valid student.`);
						}
						attributeSubgroups[attributes[groupingIndex]].splice(0,1); // Remove the student
						studentIndex += 1; // To avoid going past the end of the total number of students
					} else if (groupingType == "Same") {
						// Pull from the starting group index and fill until full
						student = attributeSubgroups[attributes[groupingIndex]][0]; // Get the student
						if (student == undefined) {
							groupingIndex += 1;
							if (groupingIndex >= attributes.length) {groupingIndex = 0;} // Wrap back to 0
							student = attributeSubgroups[attributes[groupingIndex]][0];
						}
						attributeSubgroups[attributes[groupingIndex]].splice(0,1); // Remove the student
						studentIndex += 1; // To avoid going past the end of the total number of students
					}
				} else {
					student = shuffled[studentIndex++];
				}
				const seatNameDiv = document.createElement('div');
				seatNameDiv.className = 'seat-name';
				seatNameDiv.textContent = student ? student["First Name"] + " " + student["Last Name"][0] + "." || '' : '';
				seatDiv.appendChild(seatNumDiv);
				seatDiv.appendChild(seatNameDiv);
				seatRowDiv.appendChild(seatDiv);
				seatIndex += 1;
			}
			tableDiv.appendChild(seatRowDiv);
		}
		tableIndex += 1
		rowDiv.appendChild(tableDiv)
		}
	
		chartContainer.appendChild(rowDiv);
	}
	// Render the roster selector now that roster selection could have changed
	renderRosterSelector("seating-charts");
	
}

// === Roster Selector UI ===
function renderRosterSelector(pageElementID) {
	const containers = document.getElementsByName('roster-selector');
	Array.from(containers).forEach((container) => {
		if (!container) return;
		container.innerHTML = '';

		const selectBoxContainer = document.createElement('div')
		const optionsContainer = document.createElement('div')
		selectBoxContainer.className = "sub-toolbar"
		optionsContainer.className = "sub-toolbar"
		const label = document.createElement('p')
		label.textContent = "Roster: "
		const select = document.createElement('select');
		select.id = 'roster-dropdown';
		getAllRosterNames().forEach(name => {
			const option = document.createElement('option');
			option.value = name;
			option.textContent = name;
			if (name === activeRosterName) option.selected = true;
			select.appendChild(option);
		});

		select.onchange = () => {
			activeRosterName = select.value;
			loadActiveRoster();
			renderRosterSelector(pageElementID);
		};
		
		selectBoxContainer.appendChild(label);
		selectBoxContainer.appendChild(select);
		container.appendChild(selectBoxContainer);
		
		if (pageElementID == 'rosters') {
			const editBtn = document.createElement('button');
			editBtn.textContent = "Edit";
			editBtn.addEventListener("click", function() {editRoster("toggle")});

			const renameBtn = document.createElement('button');
			renameBtn.textContent = "Rename";
			renameBtn.onclick = renameRoster;

			const deleteBtn = document.createElement('button');
			deleteBtn.textContent = "Delete";
			deleteBtn.onclick = deleteRoster;

			const saveBtn = document.createElement('button');
			saveBtn.textContent = "Save";
			saveBtn.onclick = saveRoster;

			const saveNewBtn = document.createElement('button');
			saveNewBtn.textContent = "Save as";
			saveNewBtn.onclick = saveRosterAsNew;
			
			optionsContainer.appendChild(editBtn);
			optionsContainer.appendChild(renameBtn);
			optionsContainer.appendChild(deleteBtn);
			optionsContainer.appendChild(saveBtn);
			optionsContainer.appendChild(saveNewBtn);
			
		} else if (pageElementID == 'seating-charts') {
			// Build possible grouping columns for the current seating chart
			const labelGroupingColumn = document.createElement('p');
			labelGroupingColumn.textContent = "Grouping Column: ";
			const selectGroupingColumn = document.createElement('select');
			selectGroupingColumn.id = 'grouping-column-dropdown';
			const noneOption = document.createElement('option');
			noneOption.value = "None";
			noneOption.textContent = "None";
			selectGroupingColumn.appendChild(noneOption);
			noneOption.selected = true;
			if (currentRoster != undefined && currentRoster != null && currentRoster.length > 0) {
				Object.keys(currentRoster[0]).forEach(header => {
					const optionGroupingColumn = document.createElement('option');
					optionGroupingColumn.value = header;
					optionGroupingColumn.textContent = header;
					selectGroupingColumn.appendChild(optionGroupingColumn);
				});
			}
			
			optionsContainer.appendChild(labelGroupingColumn);
			optionsContainer.appendChild(selectGroupingColumn);
			
			// Build same or different select
			const labelGroupingType = document.createElement('p');
			labelGroupingType.textContent = "Grouping Type: ";
			const selectGroupingType = document.createElement('select');
			selectGroupingType.id = 'grouping-type-dropdown';
			const groupingTypes = ["Mixed", "Same"];
			groupingTypes.forEach(type => {
				const optionGroupingType = document.createElement('option');
				optionGroupingType.value = type;
				optionGroupingType.textContent = type;
				selectGroupingType.appendChild(optionGroupingType);
			});
			
			optionsContainer.appendChild(labelGroupingType);
			optionsContainer.appendChild(selectGroupingType);
		}
		container.appendChild(optionsContainer);
	});
}