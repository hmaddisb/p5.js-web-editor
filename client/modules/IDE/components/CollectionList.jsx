import format from 'date-fns/format';
import PropTypes from 'prop-types';
import React from 'react';
import { Helmet } from 'react-helmet';
import InlineSVG from 'react-inlinesvg';
import { connect } from 'react-redux';
import { Link } from 'react-router';
import { bindActionCreators } from 'redux';
import classNames from 'classnames';
import * as ProjectActions from '../actions/project';
import * as ProjectsActions from '../actions/projects';
import * as CollectionsActions from '../actions/collections';
import * as ToastActions from '../actions/toast';
import * as SortingActions from '../actions/sorting';
import * as IdeActions from '../actions/ide';
import getSortedCollections from '../selectors/collections';
import Loader from '../../App/components/loader';

const arrowUp = require('../../../images/sort-arrow-up.svg');
const arrowDown = require('../../../images/sort-arrow-down.svg');
const downFilledTriangle = require('../../../images/down-filled-triangle.svg');

class CollectionListRowBase extends React.Component {
  static projectInCollection(project, collection) {
    return collection.items.find(item => item.project.id === project.id) != null;
  }

  constructor(props) {
    super(props);
    this.state = {
      optionsOpen: false,
      renameOpen: false,
      renameValue: props.collection.name,
      isFocused: false
    };
  }

  onFocusComponent = () => {
    this.setState({ isFocused: true });
  }

  onBlurComponent = () => {
    this.setState({ isFocused: false });
    setTimeout(() => {
      if (!this.state.isFocused) {
        this.closeAll();
      }
    }, 200);
  }

  openOptions = () => {
    this.setState({
      optionsOpen: true
    });
  }

  closeOptions = () => {
    this.setState({
      optionsOpen: false
    });
  }

  toggleOptions = () => {
    if (this.state.optionsOpen) {
      this.closeOptions();
    } else {
      this.openOptions();
    }
  }

  openRename = () => {
    this.setState({
      renameOpen: true
    });
  }

  closeRename = () => {
    this.setState({
      renameOpen: false
    });
  }

  closeAll = () => {
    this.setState({
      renameOpen: false,
      optionsOpen: false
    });
  }

  handleRenameChange = (e) => {
    this.setState({
      renameValue: e.target.value
    });
  }

  handleRenameEnter = (e) => {
    if (e.key === 'Enter') {
      // TODO pass this func
      this.props.changeProjectName(this.props.collection.id, this.state.renameValue);
      this.closeAll();
    }
  }

  resetSketchName = () => {
    this.setState({
      renameValue: this.props.collection.name
    });
  }

  handleDropdownOpen = () => {
    this.closeAll();
    this.openOptions();
  }

  handleRenameOpen = () => {
    this.closeAll();
    this.openRename();
  }

  handleSketchDownload = () => {
    this.props.exportProjectAsZip(this.props.collection.id);
  }

  handleSketchDuplicate = () => {
    this.closeAll();
    this.props.cloneProject(this.props.collection.id);
  }

  handleSketchShare = () => {
    this.closeAll();
    this.props.showShareModal(this.props.collection.id, this.props.collection.name, this.props.username);
  }

  handleSketchDelete = () => {
    this.closeAll();
    if (window.confirm(`Are you sure you want to delete "${this.props.collection.name}"?`)) {
      this.props.deleteProject(this.props.collection.id);
    }
  }

  handleCollectionAdd = () => {
    this.props.addToCollection(this.props.collection.id, this.props.project.id);
  }

  handleCollectionRemove = () => {
    this.props.removeFromCollection(this.props.collection.id, this.props.project.id);
  }

  render() {
    const { collection, username } = this.props;
    const { renameOpen, optionsOpen, renameValue } = this.state;
    const userIsOwner = this.props.user.username === this.props.username;

    const dropdown = (
      <td className="sketch-list__dropdown-column">
        <button
          className="sketch-list__dropdown-button"
          onClick={this.toggleOptions}
          onBlur={this.onBlurComponent}
          onFocus={this.onFocusComponent}
        >
          <InlineSVG src={downFilledTriangle} alt="Menu" />
        </button>
        {optionsOpen &&
          <ul
            className="sketch-list__action-dialogue"
          >
            {userIsOwner &&
              <li>
                <button
                  className="sketch-list__action-option"
                  onClick={this.handleSketchDelete}
                  onBlur={this.onBlurComponent}
                  onFocus={this.onFocusComponent}
                >
                  Delete
                </button>
              </li>}
          </ul>
        }
      </td>
    );

    return (
      <tr
        className="sketches-table__row"
        key={collection.id}
      >
        <th scope="row">
          <Link to={{ pathname: `/${username}/collections/${collection.id}`, state: { skipSavingPath: true } }}>
            {renameOpen ? '' : collection.name}
          </Link>
          {renameOpen
            &&
            <input
              value={renameValue}
              onChange={this.handleRenameChange}
              onKeyUp={this.handleRenameEnter}
              onBlur={this.resetSketchName}
              onClick={e => e.stopPropagation()}
            />
          }
        </th>
        <td>{format(new Date(collection.createdAt), 'MMM D, YYYY h:mm A')}</td>
        <td>{format(new Date(collection.updatedAt), 'MMM D, YYYY h:mm A')}</td>
        <td>{(collection.items || []).length}</td>
        <td>{dropdown}</td>
      </tr>);
  }
}

CollectionListRowBase.propTypes = {
  addToCollection: PropTypes.func.isRequired,
  removeFromCollection: PropTypes.func.isRequired,
  collection: PropTypes.shape({
    id: PropTypes.string.isRequired,
    name: PropTypes.string.isRequired
  }).isRequired,
  username: PropTypes.string.isRequired,
  user: PropTypes.shape({
    username: PropTypes.string,
    authenticated: PropTypes.bool.isRequired
  }).isRequired,
  deleteProject: PropTypes.func.isRequired,
  showShareModal: PropTypes.func.isRequired,
  cloneProject: PropTypes.func.isRequired,
  exportProjectAsZip: PropTypes.func.isRequired,
  changeProjectName: PropTypes.func.isRequired
};

function mapDispatchToPropsSketchListRow(dispatch) {
  return bindActionCreators(Object.assign({}, CollectionsActions, ProjectActions, IdeActions), dispatch);
}

const CollectionListRow = connect(null, mapDispatchToPropsSketchListRow)(CollectionListRowBase);

class CollectionList extends React.Component {
  constructor(props) {
    super(props);
    this.props.getCollections(this.props.username);
    this.props.resetSorting();
    this._renderFieldHeader = this._renderFieldHeader.bind(this);
  }

  getTitle() {
    if (this.props.username === this.props.user.username) {
      return 'p5.js Web Editor | My collections';
    }
    return `p5.js Web Editor | ${this.props.username}'s collections`;
  }

  hasCollections() {
    return !this.props.loading && this.props.collections.length > 0;
  }

  _renderLoader() {
    if (this.props.loading) return <Loader />;
    return null;
  }

  _renderEmptyTable() {
    if (!this.props.loading && this.props.collections.length === 0) {
      return (<p className="sketches-table__empty">No collections.</p>);
    }
    return null;
  }

  _renderFieldHeader(fieldName, displayName) {
    const { field, direction } = this.props.sorting;
    const headerClass = classNames({
      'sketches-table__header': true,
      'sketches-table__header--selected': field === fieldName
    });
    return (
      <th scope="col">
        <button className="sketch-list__sort-button" onClick={() => this.props.toggleDirectionForField(fieldName)}>
          <span className={headerClass}>{displayName}</span>
          {field === fieldName && direction === SortingActions.DIRECTION.ASC &&
            <InlineSVG src={arrowUp} />
          }
          {field === fieldName && direction === SortingActions.DIRECTION.DESC &&
            <InlineSVG src={arrowDown} />
          }
        </button>
      </th>
    );
  }

  render() {
    const username = this.props.username !== undefined ? this.props.username : this.props.user.username;
    return (
      <div className="sketches-table-container">
        <Helmet>
          <title>{this.getTitle()}</title>
        </Helmet>

        <Link to={`/${username}/collections/create`}>New collection</Link>

        {this._renderLoader()}
        {this._renderEmptyTable()}
        {this.hasCollections() &&
          <table className="sketches-table" summary="table containing all collections">
            <thead>
              <tr>
                {this._renderFieldHeader('name', 'Name')}
                {this._renderFieldHeader('createdAt', 'Date Created')}
                {this._renderFieldHeader('updatedAt', 'Date Updated')}
                {this._renderFieldHeader('numItems', '# sketches')}
                <th scope="col"></th>
              </tr>
            </thead>
            <tbody>
              {this.props.collections.map(collection =>
                (<CollectionListRow
                  key={collection.id}
                  collection={collection}
                  user={this.props.user}
                  username={username}
                />))}
            </tbody>
          </table>}
      </div>
    );
  }
}

const ProjectShape = PropTypes.shape({
  id: PropTypes.string.isRequired,
  name: PropTypes.string.isRequired,
  createdAt: PropTypes.string.isRequired,
  updatedAt: PropTypes.string.isRequired,
  user: PropTypes.shape({
    username: PropTypes.string.isRequired
  }).isRequired,
});

const ItemsShape = PropTypes.shape({
  createdAt: PropTypes.string.isRequired,
  updatedAt: PropTypes.string.isRequired,
  project: ProjectShape
});

CollectionList.propTypes = {
  user: PropTypes.shape({
    username: PropTypes.string,
    authenticated: PropTypes.bool.isRequired
  }).isRequired,
  getCollections: PropTypes.func.isRequired,
  collections: PropTypes.arrayOf(PropTypes.shape({
    id: PropTypes.string.isRequired,
    name: PropTypes.string.isRequired,
    description: PropTypes.string,
    createdAt: PropTypes.string.isRequired,
    updatedAt: PropTypes.string.isRequired,
    items: PropTypes.arrayOf(ItemsShape),
  })).isRequired,
  username: PropTypes.string,
  loading: PropTypes.bool.isRequired,
  toggleDirectionForField: PropTypes.func.isRequired,
  resetSorting: PropTypes.func.isRequired,
  sorting: PropTypes.shape({
    field: PropTypes.string.isRequired,
    direction: PropTypes.string.isRequired
  }).isRequired,
  project: PropTypes.shape({
    id: PropTypes.string,
    owner: PropTypes.shape({
      id: PropTypes.string
    })
  })
};

CollectionList.defaultProps = {
  project: {
    id: undefined,
    owner: undefined
  },
  username: undefined
};

function mapStateToProps(state) {
  return {
    user: state.user,
    collections: getSortedCollections(state),
    sorting: state.sorting,
    loading: state.loading,
    project: state.project
  };
}

function mapDispatchToProps(dispatch) {
  return bindActionCreators(
    Object.assign({}, CollectionsActions, ProjectsActions, ToastActions, SortingActions),
    dispatch
  );
}

export default connect(mapStateToProps, mapDispatchToProps)(CollectionList);