package com.vostroworld.credentials

import androidx.core.content.ContextCompat
import androidx.credentials.CreateCredentialResponse
import androidx.credentials.CreatePasswordRequest
import androidx.credentials.CredentialManager
import androidx.credentials.CredentialManagerCallback
import androidx.credentials.GetCredentialRequest
import androidx.credentials.GetCredentialResponse
import androidx.credentials.GetPasswordOption
import androidx.credentials.PasswordCredential
import androidx.credentials.exceptions.CreateCredentialException
import androidx.credentials.exceptions.GetCredentialException
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod

/**
 * "Remember me" on Android: saves and offers back the login through
 * Credential Manager, which stores it in Google Password Manager under the
 * Google account signed in on the phone.
 *
 * Both calls resolve rather than reject — a dismissed sheet, no saved login,
 * or a phone without Play Services just means "nothing happened", and the
 * login screen carries on as normal.
 */
class PasswordCredentialsModule(reactContext: ReactApplicationContext) :
  ReactContextBaseJavaModule(reactContext) {

  override fun getName() = "PasswordCredentials"

  /** Shows Google's "Save password?" sheet. Resolves true once saved. */
  @ReactMethod
  fun save(id: String, password: String, promise: Promise) {
    val activity = reactApplicationContext.currentActivity ?: return promise.resolve(false)
    CredentialManager.create(activity).createCredentialAsync(
      activity,
      CreatePasswordRequest(id, password),
      null,
      ContextCompat.getMainExecutor(activity),
      object : CredentialManagerCallback<CreateCredentialResponse, CreateCredentialException> {
        override fun onResult(result: CreateCredentialResponse) = promise.resolve(true)
        override fun onError(e: CreateCredentialException) = promise.resolve(false)
      },
    )
  }

  /** Shows the saved-logins sheet. Resolves { id, password } or null. */
  @ReactMethod
  fun get(promise: Promise) {
    val activity = reactApplicationContext.currentActivity ?: return promise.resolve(null)
    CredentialManager.create(activity).getCredentialAsync(
      activity,
      GetCredentialRequest(listOf(GetPasswordOption())),
      null,
      ContextCompat.getMainExecutor(activity),
      object : CredentialManagerCallback<GetCredentialResponse, GetCredentialException> {
        override fun onResult(result: GetCredentialResponse) {
          val credential = result.credential
          if (credential is PasswordCredential) {
            promise.resolve(Arguments.createMap().apply {
              putString("id", credential.id)
              putString("password", credential.password)
            })
          } else {
            promise.resolve(null)
          }
        }
        override fun onError(e: GetCredentialException) = promise.resolve(null)
      },
    )
  }
}
