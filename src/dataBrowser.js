import React from 'react';
import PropTypes from 'prop-types';
import hoistNonReactStatics from 'hoist-non-react-statics';
import { getObjectPropertyByString } from './utils';

const DataBrowserContext = React.createContext({
  columnFlex: [],
  selected: [],
  columns: [],
  visibleColumns: [],
  viewType: '',
  selectAllCheckboxState: false,
  currentSort: {},
  checked: [],
  switchViewType: () => {},
  switchColumns: () => {},
  checkboxState: () => {},
  offsetColumns: () => {},
  checkboxToggle: () => {},
  onSelection: () => {},
  changeSortDirection: () => {},
  defaultSortMethod: () => {},
  sortData: () => {},
});

export class DataBrowser extends React.Component {
  static propTypes = {
    children: PropTypes.func,
    columnFlex: PropTypes.array,
    columns: PropTypes.arrayOf(
      PropTypes.shape({
        label: PropTypes.string.isRequired,
        sortField: PropTypes.string.isRequired,
        isLocked: PropTypes.bool,
      }),
    ).isRequired,
    currentSort: PropTypes.shape({
      sortDirection: PropTypes.string,
      sortField: PropTypes.string,
    }),
    stateReducer: PropTypes.func,
    viewType: PropTypes.string,
    viewsAvailable: PropTypes.array,
  };
  static defaultProps = {
    stateReducer: (state, changes) => changes,
    onStateChange: () => {},
    viewsAvailable: ['LIST_VIEW', 'GRID_VIEW'],
    columnFlex: ['0 0 25%', '1 1 35%', '0 0 20%', '0 0 20%'],
  };
  static stateChangeTypes = {
    deselectAll: '__deselect_all__',
    selectAll: '__select_all__',
    checkboxToggle: '__checbox_toggle__',
    switchColumns: '__switch_columns__',
    switchView: '__switch_view__',
    sortData: '__sort_data__',
  };
  static Consumer = DataBrowserContext.Consumer;
  switchColumns = ({
    type = DataBrowser.stateChangeTypes.switchColumns,
    from,
    to,
  }) => {
    const { visibleColumns: columns, offsetColumns } = this.getState();
    const index = columns.findIndex(x => x.sortField === from);
    const visibleColumns = columns.filter(col => col.sortField !== from);
    const replacement = offsetColumns().find(
      ({ sortField }) => sortField === to,
    );
    visibleColumns.splice(index, 0, replacement);
    this.internalSetState({ type, visibleColumns });
  };
  offsetColumns = () => {
    const visible = this.getState().visibleColumns.map(
      column => column.sortField,
    );
    return this.getState()
      .columns.filter(c => !c.isLocked)
      .map(column => {
        if (visible.indexOf(column.sortField) > -1) {
          return { ...column, offset: true };
        } else {
          return column;
        }
      });
  };
  onSelection = ({ type, items }) => {
    switch (this.getState().selectAllCheckboxState) {
      case true:
        return this.onDeselectAll({ type });
      case false:
        return this.onSelectAll({ type, items });
      default:
        return this.onDeselectAll({ type });
    }
  };
  onDeselectAll = ({
    type = DataBrowser.stateChangeTypes.deselectAll,
  } = {}) => {
    this.internalSetState({ type, selectAllCheckboxState: false, checked: [] });
  };
  onSelectAll = ({
    type = DataBrowser.stateChangeTypes.selectAll,
    items,
  } = {}) => {
    this.internalSetState({
      type,
      selectAllCheckboxState: true,
      checked: items,
    });
  };
  checkboxToggle = ({
    type = DataBrowser.stateChangeTypes.checkboxToggle,
    rowId,
  } = {}) => {
    if (this.getState().checked.indexOf(rowId) === -1) {
      this.internalSetState(state => ({
        type,
        selectAllCheckboxState: false,
        checked: [...state.checked, rowId],
      }));
    } else {
      this.internalSetState(state => ({
        type,
        selectAllCheckboxState: false,
        checked: state.checked.filter(id => id !== rowId),
      }));
    }
  };
  checkboxState = value => this.getState().checked.indexOf(value) !== -1;
  switchViewType = ({
    type = DataBrowser.stateChangeTypes.switchView,
    viewType,
  }) => {
    if (this.state.viewsAvailable.indexOf(viewType) > -1) {
      this.internalSetState({ type, viewType });
    } else {
      console.warn(`${viewType} not in available views`);
    }
  };
  defaultSortMethod = (a, b) => {
    const { sortField, sortDirection } = this.getState().currentSort;
    if (sortField && sortDirection) {
      let nameA = getObjectPropertyByString(a, sortField);
      let nameB = getObjectPropertyByString(b, sortField);
      // force null and undefined to the bottom
      nameA = nameA === null || nameA === undefined ? '' : nameA;
      nameB = nameB === null || nameB === undefined ? '' : nameB;
      // force any string values to lowercase
      nameA = typeof nameA === 'string' ? nameA.toLowerCase() : nameA;
      nameB = typeof nameB === 'string' ? nameB.toLowerCase() : nameB;
      // Return either 1 or -1 to indicate a sort priority
      if (sortDirection.toLowerCase() === 'asc') {
        if (nameA < nameB) {
          return -1;
        } else if (nameA > nameB) {
          return 1;
        } else {
          return 0;
        }
      }
      if (sortDirection.toLowerCase() === 'dsc') {
        if (nameA > nameB) {
          return -1;
        } else if (nameA < nameB) {
          return 1;
        } else {
          return 0;
        }
      }
      return 0;
    }
  };
  changeSortDirection = ({ sortDirection = 'asc' }) => {
    this.internalSetState({ currentSort: { sortDirection } });
  };
  toggleSortDirection = () => {
    this.internalSetState(({ currentSort }) => ({
      currentSort: {
        sortDirection: currentSort.sortDirection === 'asc' ? 'dsc' : 'asc',
        sortField: currentSort.sortField,
      },
    }));
  };
  sortData = ({
    type = DataBrowser.stateChangeTypes.sortData,
    sortField = 'id',
    sortDirection = 'asc',
  }) => {
    this.internalSetState({
      type,
      currentSort: { sortField, sortDirection },
    });
  };
  activeSort = (fieldName = '', sortDir = '') => {
    const currentSort = this.getState().currentSort;
    const isActive = currentSort.sortField === fieldName;
    const isCurrentSortDir = currentSort.sortDirection === sortDir;
    return isActive && isCurrentSortDir;
  };
  initialState = {
    columnFlex: this.props.columnFlex,
    selected: [],
    columns: this.props.columns,
    visibleColumns: this.props.columns.slice(0, this.props.columnFlex.length),
    viewType: 'LIST_VIEW',
    viewsAvailable: this.props.viewsAvailable,
    selectAllCheckboxState: false,
    currentSort: {
      sortDirection: '',
      sortField: '',
    },
    checked: [],
    //
    switchViewType: this.switchViewType,
    switchColumns: this.switchColumns,
    checkboxState: this.checkboxState,
    offsetColumns: this.offsetColumns,
    checkboxToggle: this.checkboxToggle,
    onSelection: this.onSelection,
    changeSortDirection: this.changeSortDirection,
    defaultSortMethod: this.defaultSortMethod,
    sortData: this.sortData,
    activeSort: this.activeSort,
  };
  state = this.initialState;
  isControlledProp(key) {
    return this.props[key] !== undefined;
  }
  getState(stateToMerge = this.state) {
    return Object.keys(stateToMerge).reduce((state, key) => {
      state[key] = this.isControlledProp(key)
        ? this.props[key]
        : stateToMerge[key];
      return state;
    }, {});
  }
  internalSetState = (changes, callback = () => {}) => {
    let allChanges;
    this.setState(
      currentState => {
        const combinedState = this.getState(currentState);
        return [changes]
          .map(c => (typeof c === 'function' ? c(currentState) : c))
          .map(c => {
            allChanges = this.props.stateReducer(combinedState, c) || {};
            return allChanges;
          })
          .map(
            ({ type: ignoredType, ...onlyChanges }) =>
              console.info(ignoredType) || onlyChanges,
          )
          .map(c => {
            return Object.keys(combinedState).reduce((newChanges, stateKey) => {
              if (!this.isControlledProp(stateKey)) {
                newChanges[stateKey] = c.hasOwnProperty(stateKey)
                  ? c[stateKey]
                  : combinedState[stateKey];
              }
              return newChanges;
            }, {});
          })
          .map(c => (Object.keys(c || {}).length ? c : null))[0];
      },
      () => {
        this.props.onStateChange(allChanges, this.state);
        callback();
      },
    );
  };
  render() {
    const { children } = this.props;
    const ui = typeof children === 'function' ? children(this.state) : children;
    return (
      <DataBrowserContext.Provider value={this.state}>
        {ui}
      </DataBrowserContext.Provider>
    );
  }
}

export function withDataBrowser(Component) {
  const Wrapper = React.forwardRef((props, ref) => {
    return (
      <DataBrowser.Consumer>
        {browserUtils => (
          <Component {...props} dataBrowser={browserUtils} ref={ref} />
        )}
      </DataBrowser.Consumer>
    );
  });
  Wrapper.displayName = `withDataBrowser(${Component.displayName ||
    Component.name})`;
  hoistNonReactStatics(Wrapper, Component);
  return Wrapper;
}