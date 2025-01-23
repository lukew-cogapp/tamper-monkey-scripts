// ==UserScript==
// @name         Linear Issues Selector with Dynamic Date and Project Filter
// @namespace    http://tampermonkey.net/
// @version      1.1
// @description  Fetch and display Linear issues updated since yesterday for the selected project and enhance the TRS entry experience
// @author       Luke Watson-Davies
// @match        http://trs.office.cogapp.com/timereportentry/create*
// @grant        GM_xmlhttpRequest
// ==/UserScript==

(function () {
    'use strict';

    // Linear API Token (replace with your token)
    const LINEAR_API_TOKEN = '';

    // Linear GraphQL API Endpoint
    const LINEAR_API_URL = 'https://api.linear.app/graphql';

    // Define shortcut projects (project name and ID must match your requirements)
    const shortcutProjects = [
        { name: 'NTS', id: '1563' },
        { name: 'Infra', id: '1410' },
        { name: 'YBC', id: '1569' },
        { name: 'UYL', id: '1557' },
        { name: 'Getty', id: '1573' },
        { name: 'Holiday', id: '1368' },
    ];

    const shortcutAreas = [
        { name: "PM", match: "project management" },
        { name: "Dev", match: "development" }
    ];

    // Function to create shortcut buttons
    function addProjectShortcuts() {
        // Find the project select element
        const projectSelect = document.getElementById('project_select');
        if (!projectSelect) {
            console.error('Project select element not found.');
            return;
        }

        // Create a container for the shortcut buttons
        const shortcutContainer = document.createElement('div');
        shortcutContainer.className = 'shortcut-container';
        shortcutContainer.style.marginTop = '10px';

        // Create a button for each shortcut project
        shortcutProjects.forEach((project) => {
            const button = document.createElement('button');
            button.type = 'button';
            button.className = 'btn btn-outline-primary'; // Bootstrap styling
            button.textContent = project.name;
            button.style.marginRight = '10px';

            // Add click event to change the select value and trigger onchange
            button.addEventListener('click', () => {
                projectSelect.value = project.id; // Set the select value
                projectSelect.dispatchEvent(new Event('change')); // Trigger the onchange event
            });

            shortcutContainer.appendChild(button);
        });

        // Insert the shortcut container after the project select element
        projectSelect.parentNode.insertBefore(shortcutContainer, projectSelect.nextSibling);
    }

    // Function to add shortcut buttons for areas
    function addAreaShortcuts() {
        // Find the Area select element
        const areaSelect = document.getElementById('area_select');
        if (!areaSelect) {
            console.error('Area select element not found.');
            return;
        }

        // Remove existing shortcut buttons if they exist
        const existingButtons = document.querySelectorAll('.area-shortcut-button');
        existingButtons.forEach(button => button.remove());

        // Create a button for each shortcut area
        shortcutAreas.forEach((area) => {
            const button = document.createElement('button');
            button.type = 'button';
            button.className = 'btn btn-outline-primary area-shortcut-button'; // Bootstrap styling and custom class
            button.textContent = area.name;
            button.style.marginTop = '10px';

            // Add click event to set the Area select value
            button.addEventListener('click', () => {
                let optionFound = false;
                Array.from(areaSelect.options).forEach((option) => {
                    if (option.textContent.toLowerCase().includes(area.match.toLowerCase())) {
                        areaSelect.value = option.value; // Set the select value
                        optionFound = true;
                        areaSelect.dispatchEvent(new Event('change')); // Trigger the onchange event
                    }
                });

                if (!optionFound) {
                    console.warn(`No option with "${area.match}" found.`);
                }
            });

            // Append the button under the Area select
            const areaDiv = document.getElementById('area_div');
            if (areaDiv) {
                areaDiv.appendChild(button);
            } else {
                console.error('Area div not found.');
            }
        });
    }

    // Function to inject CSS into the page
    function injectCSS() {
        const style = document.createElement('style');
        style.type = 'text/css';
        style.textContent = `
        .radio-container {
            display: flex;
            flex-wrap: wrap;
            gap: 10px;
        }

        .radio-label {
            display: inline-block;
            padding: .375rem .75rem;
            border: 1px solid #7c69ef; /* Matches .btn-outline-primary border color */
            border-radius: .25rem; /* Matches .btn border radius */
            background-color: transparent; /* Matches .btn background */
            color: #7c69ef; /* Matches .btn-outline-primary color */
            font-size: 1rem; /* Matches .btn font size */
            font-weight: 400; /* Matches .btn font weight */
            line-height: 1.5; /* Matches .btn line height */
            text-align: center;
            cursor: pointer;
            transition: color .15s ease-in-out, background-color .15s ease-in-out,
                        border-color .15s ease-in-out, box-shadow .15s ease-in-out;
        }

        .radio-label:hover {
            background-color: #e9ecef; /* Matches hover effect */
        }

        .radio-label.active {
            background-color: #7c69ef; /* Active background */
            color: #fff; /* Active text color */
            border-color: #7c69ef; /* Matches active state in buttons */
        }

        .radio-label input[type="radio"] {
            display: none; /* Hide the radio button */
        }
    `;
        document.head.appendChild(style);
    }

    // Function to replace the <select> with styled radio buttons
    function replaceSelectWithStyledRadios() {
        // Find the select element
        const selectElement = document.querySelector('select[name="hours"]');
        if (!selectElement) {
            console.error('Target <select> element not found.');
            return;
        }

        // Create a container for the styled radio buttons
        const radioContainer = document.createElement('div');
        radioContainer.className = 'radio-container';
        radioContainer.style.marginBottom = '10px';

        // Iterate through the select options, creating radio buttons up to value 8.0
        Array.from(selectElement.options).forEach((option) => {
            const value = parseFloat(option.value); // Parse the value as a float
            if (isNaN(value) || value > 8) return; // Skip invalid or values > 8

            // Create a radio button and its label
            const label = document.createElement('label');
            label.className = 'radio-label'; // Optional class for styling
            label.textContent = option.textContent.trim();

            const radio = document.createElement('input');
            radio.type = 'radio';
            radio.name = 'hours'; // Use the same name as the original <select> for form submission
            radio.value = value;
            radio.style.display = 'none'; // Hide the radio button

            // Pre-select the radio if it matches the current <select> value
            if (selectElement.value === option.value) {
                radio.checked = true;
                label.classList.add('active'); // Add the active class
            }

            // Add click event to toggle the active state
            label.addEventListener('click', () => {
                // Clear active state from all labels
                radioContainer.querySelectorAll('.radio-label').forEach((lbl) => lbl.classList.remove('active'));
                // Set active state on the clicked label
                label.classList.add('active');
            });

            label.appendChild(radio);
            radioContainer.appendChild(label);
        });

        // Replace the select element with the radio container
        selectElement.parentNode.replaceChild(radioContainer, selectElement);
    }

    window.addEventListener('load', () => {
        injectCSS();
        replaceSelectWithStyledRadios();
        addProjectShortcuts();
    });

    // Function to calculate yesterday's date in YYYY-MM-DD format
    const getYesterdayDate = () => {
        const date = new Date();
        date.setDate(date.getDate() - 1);
        return date.toISOString().split('T')[0];
    };

    // Function to dynamically build the GraphQL query
    const buildQuery = (teamIdentifier) => {
        const yesterday = getYesterdayDate();
        return `
            query myIssues {
              issues(filter: {
                subscribers: { isMe: { eq: true } },
                updatedAt: { gte: "${yesterday}" },
                team: { key: { eq: "${teamIdentifier}" } }
              }) {
                nodes {
                  identifier
                  title
                  team {
                    name
                  }
                }
              }
            }
        `;
    };

    // New function to build a query without the team filter
    const buildQueryWithoutTeamFilter = () => {
        const yesterday = getYesterdayDate();
        return `
        query myIssuesWithoutTeam {
          issues(filter: {
            subscribers: { isMe: { eq: true } },
            updatedAt: { gte: "${yesterday}" }
          }) {
            nodes {
              identifier
              title
              team {
                name
              }
            }
          }
        }
    `;
    };

    // Update the fetchLinearIssues function to handle the optional teamIdentifier
    function fetchLinearIssues(teamIdentifier) {
        const query = teamIdentifier ? buildQuery(teamIdentifier) : buildQueryWithoutTeamFilter();
        return new Promise((resolve, reject) => {
            GM_xmlhttpRequest({
                method: 'POST',
                url: LINEAR_API_URL,
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': LINEAR_API_TOKEN
                },
                data: JSON.stringify({ query }),
                onload: (response) => {
                    if (response.status === 200) {
                        const data = JSON.parse(response.responseText);
                        if (data.errors) {
                            reject(`GraphQL Error: ${data.errors[0].message}`);
                        } else {
                            resolve(data.data.issues.nodes);
                        }
                    } else {
                        reject(`HTTP Error: ${response.statusText}`);
                    }
                },
                onerror: (error) => {
                    reject(error);
                }
            });
        });
    }

    // Function to parse the team identifier from the project name
    const parseTeamIdentifier = (projectName) => {
        const match = projectName.split('-')[0]?.trim(); // Extract the part before the hyphen
        return match ? match.replace(/[^a-zA-Z]/g, '') : null; // Remove non-alphabetic characters
    };


    // Function to inject the <select> element above the target <textarea>
    async function injectSelect(teamIdentifier) {
        try {
            const existingSelect = document.querySelector('#linear-issues-select');
            if (existingSelect) {
                console.log('found existing select');
                existingSelect.remove();
            }

             // Skip Linear issues fetching if the API token is blank
            if (!LINEAR_API_TOKEN) {
                console.warn('LINEAR_API_TOKEN is blank. Skipping Linear issues fetching.');
                return;
            }

            let issues = await fetchLinearIssues(teamIdentifier);

            // If no issues are returned, re-run the query without the team filter
            if (issues.length === 0) {
                console.warn(`No issues found for team: ${teamIdentifier}. Fetching without team filter.`);
                issues = await fetchLinearIssues(null); // Pass `null` to indicate no team filter
            }

            if (issues.length === 0) {
                console.warn('No issues found for yesterday or today, even without team filter.');
                return;
            }

            const select = document.createElement('select');
            select.id = 'linear-issues-select';
            select.className = 'form-control';
            select.style.marginBottom = '10px';

            const defaultOption = document.createElement('option');
            defaultOption.text = 'Select a Linear Issue';
            defaultOption.value = '';
            select.appendChild(defaultOption);

            // Group issues by team name
            const groupedIssues = issues.reduce((groups, issue) => {
                const teamName = issue.team.name || 'No Team';
                if (!groups[teamName]) {
                    groups[teamName] = [];
                }
                groups[teamName].push(issue);
                return groups;
            }, {});

            // Create <optgroup> for each team
            Object.entries(groupedIssues).forEach(([teamName, teamIssues]) => {
                const optGroup = document.createElement('optgroup');
                optGroup.label = teamName;

                teamIssues.forEach(issue => {
                    const option = document.createElement('option');
                    option.text = `${issue.identifier} - ${issue.title}`;
                    option.value = issue.identifier;
                    optGroup.appendChild(option);
                });

                select.appendChild(optGroup);
            });

            const targetTextarea = document.querySelector('textarea[name="description"]');
            if (!targetTextarea) {
                console.error('Target <textarea> not found.');
                return;
            }

            // Append the selected identifier to the textarea when the <select> value changes
            select.addEventListener('change', (event) => {
                const selectedIdentifier = event.target.value;
                if (selectedIdentifier) {
                    targetTextarea.value += selectedIdentifier; // Append to the textarea
                }
            });

            // Insert the <select> above the target <textarea>
            targetTextarea.parentNode.insertBefore(select, targetTextarea);

        } catch (error) {
            console.error('Failed to fetch or display issues:', error);
        }
    }

    // Add an event listener to the project select element
    const projectSelect = document.getElementById('project_select');
    if (projectSelect) {
        projectSelect.addEventListener('change', (event) => {
            const selectedOption = event.target.selectedOptions[0];
            const projectName = selectedOption?.textContent?.trim();
            if (projectName) {
                const teamIdentifier = parseTeamIdentifier(projectName);
                if (teamIdentifier) {
                    console.log(`Fetching Linear issues for team: ${teamIdentifier}`);
                    injectSelect(teamIdentifier);
                } else {
                    console.error('Failed to parse team identifier from project name.');
                }
            }
            // Call addPMButton to update the PM button for the updated "Area" options
            setTimeout(() => {
                addAreaShortcuts();
            }, 100); // Delay to ensure the "Area" options are updated
        });
    } else {
        console.error('#project_select element not found.');
    }
})();
