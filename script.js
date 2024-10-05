
// Set up dimensions
const margin = { top: 60, right: 20, bottom: 80, left: 150 };  // Increase bottom margin for x-axis label
const width = 1200 - margin.left - margin.right;

// A predefined constant that specifies how much vertical space should be allocated per data point (row).
// Each data point gets its own "slot" on the y-axis, and this multiplier determines how tall each slot should be.
const rowHeight = 20;

// List of critical states to highlight in y-axis
const highlightedStates = [
    'Pennsylvania', 'Georgia', 'North Carolina', 'Wisconsin', 'Michigan',
    'Arizona', 'Nevada', 'Nebraska', 'New Hampshire', 'Ohio', 'Montana'
];

// Initial filtering state
let filters = {
    all: true,
    post: true,
    postElectronic: true 
};

// Load data from external CSV file and parse it
d3.csv('data.csv', function (d) {
    const parseDate = d3.timeParse('%m/%d/%Y');
    const recommended_mail_date = d['Recommended Mail Date'] === "N/A" ? null : parseDate(d['Recommended Mail Date']);
    const postmark_deadline = d['Ballot Postmark Deadline'] === "N/A" ? null : parseDate(d['Ballot Postmark Deadline']);
    const receipt_deadline = d['Ballot Receipt Deadline'] === "N/A" ? null : parseDate(d['Ballot Receipt Deadline']);
    const return_methods = d['Return Methods'];

    return {
        state: d.State,
        recommended_mail_date: recommended_mail_date,
        ballot_postmark_deadline: postmark_deadline,
        ballot_receipt_deadline: receipt_deadline,
        return_methods: return_methods
    };
}).then(data => {

    // Sort the data by recommended mail date, with nulls at the bottom
    data.sort((a, b) => {
        if (a.recommended_mail_date === null) return 1;
        if (b.recommended_mail_date === null) return -1;
        return d3.ascending(a.recommended_mail_date, b.recommended_mail_date);
    });
    //---------------------------- Chart Setup ----------------------------
    // Establish the height of the chart based on the number of data points (rows) in the dataset and how much vertical space each row is allocated.
    const height = data.length * rowHeight; // If there are 10 data points in the dataset, the height would be: height = 10 * 20 = 200 pixels

    // Setup chart container dimensions, layout, and spacing 
    const svg = d3.select('#chart')
        .attr('width', width + margin.left + margin.right)
        .attr('height', height + margin.top + margin.bottom)
        .append('g')
        .attr('transform', `translate(${margin.left},${margin.top})`);

    //---------------------------- Axis Scales ----------------------------
    // Establish a startDate and endDate for the x-axis (time axis)
    const minDate = d3.min(data, d => d.recommended_mail_date ? d.recommended_mail_date : Infinity);
    const startDate = d3.timeDay.offset(minDate, -10); // "-10" is a buffer (10 days before the earliest date in the dataset). The purpose is to add some space to the chart before the first data point, making the timeline visually clearer
    const endDate = d3.max(data, d => d.ballot_receipt_deadline);
    
    // Map dates from the dataset to the horizontal (x) axis of the chart.
    const x = d3.scaleTime()            // Map a continuous input domain (dates or times) to a continuous output range (pixel values on the x-axis).
        .domain([startDate, endDate])
        .range([0, width]);

    // Map states from the dataset to the vertical (y) axis of the chart.
    const y = d3.scaleBand()            // Map categorical values (in this case, states) to positions along the vertical (y) axis of the chart.
        .domain(data.map(d => d.state)) 
        .range([0, height])             // Maps the first state in the domain (e.g., the first state in the dataset) to 0 (the top of the chart) and the last state in the domain to height (the bottom of the chart).
        .padding(0.2);                  // Each band will have 20% of its height as padding between it and the next band.

    //---------------------------- X Axis ----------------------------
    // Fn() configure x-axis
    const xAxis = d3.axisBottom(x)           // Creates an axis at the bottom of the chart using the x scale
        .ticks(d3.timeDay.every(2))          // Specifies tick intervals (every 2 days)
        .tickFormat(d3.timeFormat('%b %d')); // %b is the abbreviated month name (e.g., "Jan", "Feb"). %d is the day of the month (01-31).
    
        // Style & Render x-axis (dates)
    svg.append('g')                                     // Create <g>. All x-axis components (ticks, labels, lines) will be contained inside this group element.
        .attr('transform', `translate(0,${height})`)    // Places x-axis group at the bottom of the chart
        .call(xAxis)                                    // Render the x-axis inside <g>
        .selectAll('text')                              // Select all the text elements (tick labels, i.e., dates) inside the x-axis group.
        .attr('transform', 'rotate(-45)')               // Rotates selected x-axis labels ^^^^ by -45 degrees to prevent them from overlapping
        .style('text-anchor', 'end')                    // When text is rotated, aligning it to the end makes it look neater and better positioned along the tick marks.
        .attr('dy', '.35em')                            // Applies a small verticnal shift to the text labels to better vertically align w/ tick marks
        .style('font-size', '12px')                     // Sets the font size of the x-axis labels
        .attr("class", "x-axis")                        // x-axis styling 

    // Add label below x-axis
    svg.append('text')                                  // Append a new <text> element. It will contain the label for the x-axis.
        .attr('x', width / 2)                           // Sets the x-position of the text element to the middle of the chart
        .attr('y', height + margin.bottom - 10)         // Sets the y-position of the text element slightly below the chart
        .attr('class', 'chart-axis-label')              // Apply the CSS class
        .text('Ballot Deadlines');                      // Set the label text
    
    //---------------------------- Y Axis ----------------------------
    // Fn() configure y-axis
    const yAxis = d3.axisLeft(y)                        // Creates a left-oriented axis using the y scale
        .tickFormat(d => {                              // Not used, but useful when you want to actually modify the labels before displaying them
            if (highlightedStates.includes(d)) {        // Check if the state is in the highlighted list
                return d;                                       // Keep the text as it is, and we'll style it below
            } else {
                return d;                                       // Return the label as normal for other states
            }
        });
    
    // Style & Render the y-axis (state names)
    renderYAxis(svg, yAxis);

    // Style tick labels in the y-axis based on whether they are highlighted
    styleHighlightedStatesYAxis(svg, highlightedStates);

    
    // Filter Fn() filter data based on return methods depending on user-selected checkboxes
    function applyFilters() {
        // Filter the data based on selected return methods
        const filteredData = data.filter(d => {
            if (filters.all) {
                return true;
            } else if (filters.post) {
                return d.return_methods === 'Post';
            } else if (filters.postElectronic) {
                return d.return_methods === 'Post, Electronic';
            } else {
                return false;
            }
        });

        // Extract the states included in the filtered data
        const filteredStates = new Set(filteredData.map(d => d.state));

        // Remove the old y-axis
        svg.select(".y-axis").remove();           

        // Update y-axis domain to include only the filtered states
        y.domain(filteredStates);

        // Re-draw the y-axis with the updated domain
        renderYAxis(svg, yAxis);

        // Style tick labels in the y-axis based on whether they are highlighted
        styleHighlightedStatesYAxis(svg, highlightedStates);

        // Now, update the chart data (lines and dots)
        updateChart(filteredData);
    }

    // Update the chart with the filtered data
    function updateChart(filteredData) {
        // clear existing chart elements
        svg.selectAll('.dot, .line').remove();

        // draw lines based on filtered data
        svg.selectAll('.line')                                                                      // Selects any <elements>, if none exists, creates them.
            .data(filteredData.filter(d => d.recommended_mail_date && d.ballot_receipt_deadline))   // Binds the filtered data to the line elements
            .enter()                                                                                // Identifies the data points that don't yet have corresponding elements in the DOM and creates placeholders for these new data points.
            .append('line')                                                                         // This appends a new <line> element to the svg for each data point that was filtered and doesn't have a corresponding line in the DOM.
            .attr('class', 'line')                                                                  // applies .line styles
            .attr('x1', d => x(d.recommended_mail_date))                                            // sets the x-coordinate of the starting point of the line using time scale (x) based on the recommended_mail_date.
            .attr('x2', d => x(d.ballot_receipt_deadline))                                          // sets the x-coordinate of the end point of the line using time scale (x) based on the ballot_receipt_deadline.
            .attr('y1', d => y(d.state) + y.bandwidth() / 2)                                        // sets the y-coordinate of the starting point of the line using a band scale (y) to map the state to a vertical position, ensuring that each state gets its own row on the chart
            .attr('y2', d => y(d.state) + y.bandwidth() / 2)
            .attr('stroke', 'gray');

        // draw dots for recommended mail dates
        svg.selectAll('.dot-mail')                                                                  // Selects any <elements>, if none exists, creates them.
            .data(filteredData.filter(d => d.recommended_mail_date))                                // Binds the filtered data to the circle elements
            .enter()                                                                                // Identifies the data points that don't yet have corresponding elements in the DOM and creates placeholders for these new data points.
            .append('circle')                                                                       // This appends a new <circle> element to the svg for each data point that was filtered and doesn't have a corresponding line in the DOM.
            .attr('class', 'dot')                                                                   // Applies .dot styles
            .attr('cx', d => x(d.recommended_mail_date))                                            // Sets the x-coordinate (cx) of the center of the circle based on the recommended mail date.
            .attr('cy', d => y(d.state) + y.bandwidth() / 2)                                        // Sets the y-coordinate (cy) of the center of the circle using a band scale (y) to mpa the state to a specific vertical position.
            .attr('r', 6)                                                                           // This sets the radius of each circle to 6 units.
            .style('fill', '#FF6F61');                                                              

        // draw dots for postmark deadlines
        svg.selectAll('.dot-postmark')
            .data(filteredData.filter(d => d.ballot_postmark_deadline))
            .enter()
            .append('circle')
            .attr('class', 'dot')
            .attr('cx', d => x(d.ballot_postmark_deadline))
            .attr('cy', d => y(d.state) + y.bandwidth() / 2)
            .attr('r', 6)
            .style('fill', '#2171B5');

        // draw dots for receipt deadlines
        svg.selectAll('.dot-receipt')
            .data(filteredData.filter(d => d.ballot_receipt_deadline))
            .enter()
            .append('circle')
            .attr('class', 'dot')
            .attr('cx', d => x(d.ballot_receipt_deadline))
            .attr('cy', d => y(d.state) + y.bandwidth() / 2)
            .attr('r', 6)
            .style('fill', '#EF61F7');

    }
    // Create the legend container (positioned at the top of the chart)
    const legend = svg.append("g")
        .attr("class", "legend")
        .attr("transform", "translate(0, -20)");  // Adjust the position of the legend above the chart

    // Legend data: labels and their corresponding colors
    const legendData = [
        { label: 'Recommended Mail Date', color: '#FF5733' },
        { label: 'Ballot Postmark Deadline', color: '#3F78E7' },
        { label: 'Ballot Receipt Deadline', color: '#EF61F7' }
    ];

    // Add legend circles
    legend.selectAll('circle')
        .data(legendData)
        .enter()
        .append('circle')
        .attr('cx', (d, i) => i * 200)  // Horizontally space out the legend items
        .attr('cy', 0)  // Place circles in a row
        .attr('r', 6)  // Radius of the legend circles
        .style('fill', d => d.color);  // Set the fill color based on the legendData

    // Add legend labels
    legend.selectAll('text')
        .data(legendData)
        .enter()
        .append('text')
        .attr('x', (d, i) => i * 200 + 10)  // Place text labels next to the circles
        .attr('y', 4)  // Vertically align the text with the circles
        .text(d => d.label)
        .style('font-size', '14px')
        .style('fill', '#333');  // Use a darker text color for better contrast
    // Initial chart rendering
    applyFilters();

    // Event listeners for filter radio buttons
    d3.select('#post').on('change', function () {
        if (this.checked) {
            filters.all = false;
            filters.post = true;
            filters.postElectronic = false;
        }
        applyFilters();  // Re-apply filters whenever user changes the selection
    });

    d3.select('#postElectronic').on('change', function () {
        if (this.checked) {
            filters.all = false;
            filters.post = false;
            filters.postElectronic = true;
        }
        applyFilters();  // Re-apply filters whenever user changes the selection
    });
    d3.select('#all').on('change', function () {
        if (this.checked) {
            filters.all = true;
            filters.post = false;
            filters.postElectronic = false;
        }
        applyFilters();  // Re-apply filters whenever user changes the selection
    });
}).catch(error => {
    console.error("Error loading the CSV data: ", error);
});


function renderYAxis(svg, yAxis) {
    // Append and render the y-axis
    svg.append('g')                 // Create <g>. All y-axis components (ticks, labels, lines) will be contained inside this group element.
        .attr("class", "y-axis")    // Add y-axis styling class
        .call(yAxis);               // Render the y-axis inside <g>
}

function styleHighlightedStatesYAxis(svg, highlightedStates) {
    svg.selectAll('.y-axis .tick text')                                   // Limit the selection to the y-axis group
        .classed('highlighted-tick', d => highlightedStates.includes(d))  // Apply 'highlighted' class to highlighted states
        .classed('normal-tick', d => !highlightedStates.includes(d));     // Apply 'normal' class to non-highlighted states
}