'use strict';

import d3 from 'd3';
import React from 'react';
import { Im, parseNumerics, connectMap, generateTranslateString,  commaNumber }
  from './utilities.js';

import colours from './econ_colours.js';

import Header from './header.js';
import StepperRaw, { Step } from './stepper.js';
import ChartContainer from './chart-container.js';
import ColumnChartRaw from './column-chart.js';
import ColumnChartLabelRaw from './column-chart-label.js';
import BoundedSVG from './bounded-svg.js';
import AxisRaw from './axis.js';

import chroma from 'chroma-js';

import { createStore } from 'redux';
import { connect, Provider } from 'react-redux';

import {
  updateSourceData, updateCountryData,
  updateAppsData, updateStepperValue,
  updateColumnChartHighlight,
  clearColumnChartHighlight
} from './actions.js';
import updateState from './reducers.js'

var store = createStore(updateState);
window.store = store;

var columnChartMonthFormatter = d3.time.format('%B %Y');

var Stepper = connectMap({
  value : 'stepperValue'
})(StepperRaw);

var steps = [
  new Step('apps', (<span>
    Applications to the EU are at their highest level since records began.
    Nearing 100,000 per month. Almost 20% are headed to Germany.</span>), '1'
  ),
  new Step('recog', (<span>
    But not all of these asylum seekers will make it in. Recognition rates vary from country
    to country.</span>), '2'
  ),
  new Step('reloc', (<span>
    Another way in is through relocation. [Explanation of relocation agreement.]</span>), '3'
  ),
  new Step('resettle', (<span>
    Another way in is through resettlement. [Explanation of resettlement agreement.]</span>), '4'
  )
];

var dateFormatter = d3.time.format('%d/%m/%y');

class ChartLabel extends BoundedSVG {
  static get defaultProps() {
    return Im.extend(super.defaultProps, {
      fontSize : 14,
      width : 110,
      text : 'Chart label'
    });
  }
  get textElements() {
    // we're just going to make a guess here:
    var characters = this.props.width * 2 / this.props.fontSize;
    var words = this.props.text.split(' ');
    var texts = [];

    while(words.join(' ').length > characters) {
      let nextLine = [];
      while(nextLine.join(' ').length < characters) {
        nextLine.push(words.shift());
      }
      if(nextLine.join(' ').length > characters) {
        words.unshift(nextLine.pop());
      }
      texts.push(nextLine);
    }
    texts.push(words);

    return texts.map((line, idx) => {
      return (<text x="5" y={(idx + 1) * (this.props.fontSize * 1.2) + 3} fontSize={this.props.fontSize}>{line.join(' ')}</text>);
    });
  }
  render() {
    var textTransform = generateTranslateString(this.leftBound, this.topBound);

    return(<g transform={textTransform} className="label-group">
      <rect width={this.props.width} height="3" fill="red" ></rect>
      {this.textElements}
    </g>)
  }
}

class ColumnFrame extends React.Component {
  static get defaultProps() {
    return {
      columnData : [],
      columnScale : d3.scale.linear(),
      columnChartHighlight : null
    };
  }
  render() {
    var columnChartProps = {
      margin : [10, 10, 40],
      series : [
        { name : 'germany', accessor : d => d.Germany },
        { name : 'europe', accessor : d => d.otherEurope }
      ],
      yScale : d3.scale.linear().domain([0, 130000]),
      spacing : 1,
      enterHandler : d => store.dispatch(updateColumnChartHighlight(d)),
      leaveHandler : d => store.dispatch(clearColumnChartHighlight()),
      data : this.props.columnData,
      xScale : this.props.columnScale
    };
    var columnAxisProps = {
      height : 300,
      margin : [260, 10, 10],
      tickValues : d3.range(0, 90, 12),
      tickFormat : v => Math.floor(v/12) + 2008,
      scale : this.props.columnAxis
    };

    var highlight = this.props.columnChartHighlight ||
      (this.props.columnData ? this.props.columnData[this.props.columnData.length - 1] : null);
    // we're rendering this here because it generates the x/y coordinate
    // values that the label will need to render correctly. This is a
    // stupid hack but so it goes
    var chartRendered = (<ColumnChartRaw {...columnChartProps} />);
    if(!highlight || !highlight.x) {
      React.render(chartRendered, document.createElement('div'));
    }

    var total = highlight ? highlight.Germany + highlight.otherEurope : 0;
    var columnChartLabelProps = {
      position : highlight ? [highlight.x + 2, highlight['y-europe']] : [null, null],
      text : highlight ? `${columnChartMonthFormatter(highlight.month)}: ${commaNumber(highlight.Germany + highlight.otherEurope)}` : '',
      verticalOffset : total < 50000 ? -30 : 0
    };

    return(<div>
      <svg width="595" height="300">
        {chartRendered}
        <ColumnChartLabelRaw {...columnChartLabelProps} />
        <AxisRaw {...columnAxisProps} />
        <ChartLabel text="Monthly asylum applications to Europe"/>
      </svg>
      <svg>{/* for the treemap */}</svg>
    </div>)
  }
}
class BarFrame extends React.Component {
  render() {
    return(<div>Bars!</div>);
  }
}

class MigrationFSMRaw extends React.Component {
  static get defaultProps() {
    return {
      step : 'apps'
    };
  }
  get columnStep() {
    var columnProps = {
      columnData : this.props.columnData,
      columnScale : this.props.columnScale,
      columnChartHighlight : this.props.columnChartHighlight
    };
    return (<ColumnFrame {...columnProps} />);
  }
  get barStep() {
    return (<BarFrame />);
  }
  render() {
    switch(this.props.step) {
      case 'apps':
        return this.columnStep;
      case 'recog':
      case 'reloc':
      case 'resettle':
        return this.barStep;
    }
  }
}

var MigrationFSM = connectMap({
  step : 'stepperValue',
  columnData : 'appsData',
  columnScale : 'appsScale',
  columnChartHighlight : 'columnChartHighlight'
})(MigrationFSMRaw);

class Chart extends ChartContainer {
  render() {
    var stepperProps = {
      items : steps,
      action : (v) => { store.dispatch(updateStepperValue(v)); }
    };

    return(
      <div className='chart-container'>
        <Header title="To come" subtitle="Also to come"/>
        <Stepper {...stepperProps} />
        <MigrationFSM />
      </div>
    );
  }
}
var props = {
  height : 320
};

var chart = React.render(
  <Provider store={store}>
    {() => <Chart {...props} />}
  </Provider>, document.getElementById('interactive'));

d3.csv('../data/applications.csv', function(error, data) {
  data = data.map(parseNumerics).map((d) => {
    d.month = dateFormatter.parse(d.month);
    return d;
  });

  store.dispatch(updateAppsData(data));
});
