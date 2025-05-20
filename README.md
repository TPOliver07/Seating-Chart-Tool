# Seating Chart Tool
In a classroom where seating charts are used as a pedagogical tool and are often changed with specific instructional purposes,
there is a need for a way to simplify this process. This tool takes CSV student rosters in a specificed format along with 
customizeable other columns to create meaningful seating charts.
 
## Planned Limitations
In the first working version of this tool, it will only work for a classroom layout with tables of four. This simplifies 
prototyping the first version substantially, and leaves room for making a tool that is easy to use and accomplishes its goals.
In addition, this tool will use cookies to save user data about classes in the browser with the option of exporting any 
changes made or cleaner formatted version of the roster to a persistent file. 

## Pedagogical Purpose
Generating a new and thoughtful seating chart on a regular basis is challenging and time consuming. While generating a seating
chart using a computational approach requries care to ensure that it meets expectations, it does save time on a task that for
most students will not be a substantial learning setback if not handled perfectly. 

## Design
This tool will be built in a static web-app that utilizes cookies to store imported user data across sessions. Users will be
able to access three main pages of the app from a task bar at the top of the screen: Seating Charts, Rosters, and Preferences. 
Each page will have it's own sub-navigation bar for moving between user-created objects. This app should be able to run from
a single HTML file with a directory that includes necessary javascript files and the CSS stylesheet such that it could be
successfully used regardless of internet connection or district technology policies. This would allow this web abb to be
easily packaged as a standalone app for distribution to other teachers. 

### Seating Charts
Seating charts created with this tool will be displayed in a table nested inside of a div structure to represent student seats
at tables. The individual div structures can then be placed by the user in accordance with the classroom layout to create a meaningful
seating chart that students can easily use to quickly find their seat. Classroom tables can be assigned colors and names, while
individual student seats will display a student name and the persistent seat number. It is also necessary to identify prominent
features of the classroom on the seating chart so that students can successfully find their seat like the front and back of the room,
board or television, instructor's desk, or doors. 

### Rosters
Rosters will be displayed in a tabular format that follows from any traditional spreadsheet or gradebook. The most important feature
on the rosters page will be the CSV import dialog box at the top of the page that allows the user to import CSV data. Within each cell
in the tablular format will be user-editable text to change student data. In addition, the user will be able to add columns and rows
to adjust the data that is already stored rather than having to edit and import a new CSV file. 

#### Student Information
It is always necessary to consider student factors when creating a seating chart. This can be done computationally using the data stored in
the roster alongside user preferences for how students are seated. The user should be able to add columns that describe different student
traits, whether they be needs-related such as Individual Education Plans or Section 504s, personality trait related, or academic related.
After defining traits, the user should be able to specify whether students should be sat with others who have similar or different traits
and provide a priority for seating based on traits. This would allow users to create seating charts with mixed ability groupings, same
ability groupings, varied social-emotional skills, and more. 

### Preferences
The user can set preferences that handle how data is utilized and seating charts are generated. This is where the user will define the
layout of the room seating charts are constructed in as well as colors and/or names for tables. The user can also change fonts and make
other display choices here. 