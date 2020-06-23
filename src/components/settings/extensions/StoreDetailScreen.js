import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { observer } from 'mobx-react';
import webstore from 'chrome-webstore';

import { permissionText } from '../../../features/extensions/helpers';

export default @observer class ExtensionStoreDetail extends Component {
  static propTypes = {
    extension: PropTypes.string.isRequired,
  };

  state = {
    detail: {},
  }

  componentDidMount() {
    webstore.detail({ id: this.props.extension }).then((detail) => {
      console.log(detail);
      this.setState({ detail });
    });
  }

  render() {
    const { detail } = this.state;

    // Get most high resolution image
    const highResImage = detail.images && detail.images['128x128'];

    const manifest = detail.manifest ? JSON.parse(detail.manifest) : {};

    return (
      <div className="extension-info">
        <div className="extension-icon">
          <img
            src={highResImage}
            alt="Extension icon"
          />
        </div>

        <h2 className="extension-title">
          {detail.name}
        </h2>
        {detail.title && (
        <p className="extension-version">
          {`${detail.title}`}
        </p>
        )}
        {detail.version && (
        <p className="extension-version">
          {`Version ${detail.version}`}
        </p>
        )}
        {detail.users && (
        <p className="extension-version">
          {`${detail.users} Users`}
        </p>
        )}
        {detail.rating && (
        <p className="extension-version">
          {`${Math.round(detail.rating.average)}/5 Stars (${detail.rating.count} Votes)`}
        </p>
        )}

        {detail.description && (
        <p className="extension-description">{detail.description}</p>
        )}

        {detail.website && (
        <div style={{ height: 'auto' }}>
          <a className="extension-homepage" href={detail.website} target="_blank">
            <i className="mdi mdi-home" />
            {' '}
            {detail.website}
          </a>
        </div>
        )}

        {detail.url && (
        <div style={{ height: 'auto' }}>
          <a className="extension-homepage" href={detail.url} target="_blank">
            <i className="mdi mdi-home" />
            {' '}
                View in the Chrome Webstore
          </a>
        </div>
        )}

        {manifest.permissions && (
        <div className="extensions-permissions">
          <p>This extension requests the following permissions:</p>
          <ul>
            {manifest.permissions.map(permission => (
              <li key={permission}>
                    -
                {' '}
                {permissionText(permission)}
              </li>
            ))}
            {manifest.background && (
            <li>
                    - Run scripts in the background
            </li>
            )}
          </ul>
        </div>
        )}
      </div>
    );
  }
}
