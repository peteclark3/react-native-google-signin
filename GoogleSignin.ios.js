import React, { Component } from 'react';

import {
  View,
  NativeAppEventEmitter,
  NativeModules,
  requireNativeComponent,
} from 'react-native';

const { RNGoogleSignin } = NativeModules;

const RNGoogleSigninButton = requireNativeComponent('RNGoogleSigninButton', null);

class GoogleSigninButton extends Component {
  componentDidMount() {
    this._clickListener = NativeAppEventEmitter.addListener('RNGoogleSignInWillDispatch', () => {
      GoogleSigninSingleton.signinIsInProcess = true;
      this.props.onPress && this.props.onPress();
    });
  }

  componentWillUnmount() {
    this._clickListener && this._clickListener.remove();
  }

  render() {
    return (
      <RNGoogleSigninButton {...this.props}/>
    );
  }
}

GoogleSigninButton.Size = {
  Icon: RNGoogleSignin.BUTTON_SIZE_ICON,
  Standard: RNGoogleSignin.BUTTON_SIZE_STANDARD,
  Wide: RNGoogleSignin.BUTTON_SIZE_WIDE
};

GoogleSigninButton.Color = {
  Auto: RNGoogleSignin.BUTTON_COLOR_AUTO,
  Light: RNGoogleSignin.BUTTON_COLOR_LIGHT,
  Dark: RNGoogleSignin.BUTTON_COLOR_DARK
};

class GoogleSignin {

  constructor() {
    this._user = null;
    this.signinIsInProcess = false;
  }

  hasPlayServices(params = {autoResolve: true}) {
    return Promise.resolve(true);
  }

  configure(params={}) {
    if (!params.iosClientId) {
      throw new Error('GoogleSignin - Missing iOS app ClientID');
    }

    if (params.offlineAccess && !params.webClientId) {
      throw new Error('GoogleSignin - offline use requires server web ClientID');
    }

    params = [
      params.scopes || [], params.iosClientId, params.offlineAccess ? params.webClientId : ''
    ];

    RNGoogleSignin.configure(...params);
    return Promise.resolve(true);
  }

  currentUserAsync() {
    return new Promise((resolve, reject) => {
      const sucessCb = NativeAppEventEmitter.addListener('RNGoogleSignInSuccess', (user) => {
        this._user = user;
        sucessCb.remove();
        errorCb.remove();
        resolve(user);
      });

      const errorCb = NativeAppEventEmitter.addListener('RNGoogleSignInError', () => {
        sucessCb.remove();
        errorCb.remove();
        resolve(null);
      });

      RNGoogleSignin.currentUserAsync();
    });
  }

  currentUser() {
    return {...this._user};
  }

  signIn() {
    return new Promise((resolve, reject) => {
      const sucessCb = NativeAppEventEmitter.addListener('RNGoogleSignInSuccess', (user) => {
        this._user = user;
        this.signinIsInProcess = false;
        sucessCb.remove();
        errorCb.remove();
        resolve(user);
      });

      const errorCb = NativeAppEventEmitter.addListener('RNGoogleSignInError', (err) => {
        sucessCb.remove();
        errorCb.remove();
        this.signinIsInProcess = false;
        reject(err);
      });

      !this.signinIsInProcess && RNGoogleSignin.signIn();
    });
  }

  signOut() {
    return new Promise((resolve, reject) => {
      RNGoogleSignin.signOut();
      resolve();
    });
  }

  revokeAccess() {
    return new Promise((resolve, reject) => {
      const sucessCb = NativeAppEventEmitter.addListener('RNGoogleRevokeSuccess', () => {
        sucessCb.remove();
        errorCb.remove();
        resolve();
      });

      const errorCb = NativeAppEventEmitter.addListener('RNGoogleRevokeError', (err) => {
        sucessCb.remove();
        errorCb.remove();
        reject(err);
      });

      RNGoogleSignin.revokeAccess();
    });
  }

}

const GoogleSigninSingleton = new GoogleSignin();

module.exports = {GoogleSignin: GoogleSigninSingleton, GoogleSigninButton};
