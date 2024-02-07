import React, { useEffect, useRef, useState } from "react";
import * as d3 from 'd3';
import colorbrewer from 'colorbrewer';

const HeatMapComponent = () => {
    const [message, setMessage] = useState(null);
    const [dataSet, setData] = useState(null);
    const svgRef = useRef();
    const w = 800;  // width
    const h = 300;  // height
    const padding=60;
    const bottomPadding = 70;
    const topPadding = 10; // Half the padding for the top

    // Data fetching
    useEffect(() => {
        const fetchData = async () => {
            try {
                setMessage("fetching data pleas wait ...");
                const response = await fetch('https://raw.githubusercontent.com/freeCodeCamp/ProjectReferenceData/master/global-temperature.json');
                if (!response.ok) {
                    setMessage('response war  not ok!!');
                    throw new Error('server response not okay');
                }
                const json = await response.json();
                setData(json['monthlyVariance']);
            } catch (error) {
                console.warn('error', error);
                setMessage('Error fetching Data! please check your internet connection and try again');
            }
        }
        fetchData();
    }, []);

    // D3 Visual Mapping
    useEffect(() => {
        if (dataSet) {
            // Months data for the y scale 
            const monthsOfTheYear = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

           // yScale
            const yScale = d3.scaleBand()
                .domain([0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11])
                .range([topPadding, h - bottomPadding])
                .padding(0);
            // xscale
            const Xscale = d3.scaleTime()
                .domain([d3.min(dataSet, d => new Date(d['year'], 0)), d3.max(dataSet, d => new Date(d['year'], 0))])
                .range([padding, w - padding]);

            // scaleBandwidth
            const scaleBandwidth = d3.scaleBand()
                .domain(dataSet.map(d => d['year']))
                .range([padding, w - padding]);

            // colorScale
            const colorScale = d3.scaleSequential(d3.interpolateRdYlBu)
                .domain([d3.max(dataSet, d => 8.66 + d['variance']), d3.min(dataSet, d => 8.66 + d['variance'])]);

            const svg = d3.select(svgRef.current)
                .attr('viewBox', `0 0 ${w} ${h}`);

            // Rectangles
            svg.selectAll('rect')
                .data(dataSet)
                .enter()
                .append('rect')
                .attr('y', d => yScale(d['month'] - 1))
                .attr('x', d => Xscale(new Date(d['year'], 0)))
                .attr('width', scaleBandwidth.bandwidth())
                .attr('class', 'cell')
                .attr('data-month',d=>d['month']-1)
                .attr('data-year', d=>d['year'])
                .attr('data-temp',d=>d['variance']+8.66)
                
                .attr('height', (h - (topPadding + bottomPadding)) / 12) // Adjusted height
                .attr('fill', d => colorScale(8.66 + d['variance']))
                .on('mouseover', (event, d) => {
                    const year = d['year'];
                    const month = monthsOfTheYear[d['month']]
                    const baseTemperature = 8.66
                    const variance = parseFloat(d['variance'].toFixed(1))
                    const temperature = baseTemperature + variance
                    const tracatedTemp = parseFloat(temperature.toFixed(1))
                    const varienaceValue = variance >= 0 ? `+${variance}` : variance;

                    d3.select('#tooltip')
                        .style('left', `${event.pageX - 50}px`)
                        .style('top', `${event.pageY - 130}px`)
                        .attr('data-year',year)
                        .style('opacity', 1)
                        .html(`${year} ,${month}<br/>${tracatedTemp} °C<br/>${varienaceValue} °C`)
                })
                .on('mouseleave', () => {
                    d3.select('#tooltip')
                        .style('opacity', 0)
                });

            // y Axis
            const yAxis = d3.axisLeft(yScale).tickFormat(d => monthsOfTheYear[d]);
            svg.append('g')
                .attr('transform', `translate(${padding}, 0)`)
                .attr('id',"y-axis")
                
                .attr('class','yAxis')
                .call(yAxis);
                
            svg.select('.yAxis path')
                .style('opacity', 0);

            // x Axis 
            const xAxis = d3.axisBottom(Xscale)
            svg.append('g')
                .attr('id',"x-axis")
                .attr('transform', `translate(0,${h - bottomPadding})`)
                .call(xAxis);

            // Legend
            const legendColors = colorbrewer.RdYlBu[11].reverse();
            const legendWidth = 300;
            const legendHeight = 200 / legendColors.length;

            const variance = dataSet.map(function (val) {
                return val.variance;
            });
            const minTemp = 8.66 + Math.min.apply(null, variance);
            const maxTemp = 8.66 + Math.max.apply(null, variance);

            const legendThreshold = d3
                .scaleThreshold()
                .domain((function (min, max, count) {
                    const array = [];
                    const step = (max - min) / count;
                    let base = min;
                    for (let i = 1; i < count; i++) {
                        array.push(base + i * step);
                    }
                    return array;
                })(minTemp, maxTemp, legendColors.length))
                .range(legendColors);

            const legendX = d3
                .scaleLinear()
                .domain([minTemp, maxTemp])
                .range([0, legendWidth]);

            const legendXAxis = d3
                .axisBottom()
                .scale(legendX)
                .tickSize(10, 0)
                .tickValues(legendThreshold.domain())
                .tickFormat(d3.format('.1f'));

            const legend = svg
                .append('g')
                .classed('legend', true)
                .attr('id', 'legend')
                .attr('transform', `translate(${padding}, ${h - bottomPadding/1.6})`); // Adjusted position

            legend
                .append('g')
                .selectAll('rect')
                .data(
                    legendThreshold.range().map(function (color) {
                        let d = legendThreshold.invertExtent(color);
                        if (d[0] === null) {
                            d[0] = legendX.domain()[0];
                        }
                        if (d[1] === null) {
                            d[1] = legendX.domain()[1];
                        }
                        return d;
                    })
                )
                .enter()
                .append('rect')
                .style('fill', function (d) {
                    return legendThreshold(d[0]);
                })
                .attr('x', d => legendX(d[0]))
                .attr('y', 0)
                .attr('width', d => d[0] && d[1] ? legendX(d[1]) - legendX(d[0]) : legendX(null))
                .attr('height', legendHeight);

            legend
                .append('g')
                .attr('transform', `translate(0, ${legendHeight})`)
                .call(legendXAxis);
        }
    }, [dataSet]);

    return (
        <div className="ui">
           
            <div className='viewBox'>
            <div   id="title">
                <div id="title" className="main">Monthly Global Land-Surface Temperature</div>
                   <div  id="description" className="sub-title">1753 - 2015: base temperature 8.66℃</div>
            </div>
                {dataSet ? <svg ref={svgRef}></svg> : message}
                 <div id="tooltip"></div>
            </div>
        </div>
    );
}

export default HeatMapComponent;
