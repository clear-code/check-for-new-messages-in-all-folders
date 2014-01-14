/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

var CheckNewMessagesInAllFolders = {
  onPopupShowing: function CheckNewMessagesInAllFolders_onPopupShowing(aEvent) {
    var popup = aEvent.currentTarget;
    if (popup != aEvent.target) // ignore submenus
      return;

    var checkLabel = popup.getAttribute('data-label-check');
    var checkAccesskey = popup.getAttribute('data-accesskey-check');
    var uncheckLabel = popup.getAttribute('data-label-uncheck');
    var uncheckAccesskey = popup.getAttribute('data-accesskey-uncheck');

    this.allAccounts.forEach(function(aAccount) {
      aAccount = aAccount.QueryInterface(Ci.nsIMsgAccount);
      var server = aAccount.incomingServer;
      var type = server.type;
      if (type != 'imap')
        return;

      var allChecked = this.isAllChecked(aAccount);

      try {
        var subPopup = document.createElement('menupopup');

        var uncheckItem = document.createElement('menuitem');
        uncheckItem.setAttribute('label', uncheckLabel);
        uncheckItem.setAttribute('accesskey', uncheckAccesskey);
        uncheckItem.setAttribute('type', 'radio');
        uncheckItem.setAttribute('name', 'checknewmessagesinallfolders-actions-' + server.key);
        uncheckItem.setAttribute('value', server.key);
        uncheckItem.setAttribute('data-action', 'uncheck');
        if (!allChecked)
          uncheckItem.setAttribute('checked', true);
        subPopup.appendChild(uncheckItem);

        var checkItem = document.createElement('menuitem');
        checkItem.setAttribute('label', checkLabel);
        checkItem.setAttribute('accesskey', checkAccesskey);
        checkItem.setAttribute('type', 'radio');
        checkItem.setAttribute('name', 'checknewmessagesinallfolders-actions-' + server.key);
        checkItem.setAttribute('value', server.key);
        checkItem.setAttribute('data-action', 'check');
        if (allChecked)
          checkItem.setAttribute('checked', true);
          
        subPopup.appendChild(checkItem);

        var item = document.createElement('menu');
        item.setAttribute('label', server.prettyName);
        item.setAttribute('value', server.key);
        item.appendChild(subPopup);

        popup.appendChild(item);
      }
      catch(error) {
        Components.utils.reportError(error);
      }
    }, this);
  },

  onPopupHiding: function CheckNewMessagesInAllFolders_onPopupHiding(aEvent) {
    var popup = aEvent.currentTarget;
    if (popup != aEvent.target) // ignore submenus
      return;

    var range = document.createRange();
    range.selectNodeContents(popup);
    range.deleteContents();
    range.detach();
  },

  onCommand: function CheckNewMessagesInAllFolders_onCommand(aEvent) {
    const nsMsgFolderFlags = Ci.nsMsgFolderFlags;
    var item = aEvent.target;
    var server = this.getServer(item.value);
    if (item.getAttribute('data-action') == 'check') {
      this.forEachFolder(server.rootFolder, function(aFolder) {
        try {
          aFolder.setFlag(nsMsgFolderFlags.CheckNew);
        } catch(error) {
          Components.utils.reportError(error);
        }
      });
    } else {
      this.forEachFolder(server.rootFolder, function(aFolder) {
        try {
          aFolder.clearFlag(nsMsgFolderFlags.CheckNew);
        } catch(error) {
          Components.utils.reportError(error);
        }
      });
    }
  },

  get allAccounts() {
    var accountManager = Cc['@mozilla.org/messenger/account-manager;1'].getService(Ci.nsIMsgAccountManager);
    var accounts = accountManager.accounts;
    var accountsArray = [];
    if (accounts instanceof Ci.nsISupportsArray) {
      for (let i = 0, maxi = accounts.Count(); i < maxi; i++) {
        accountsArray.push(accounts.GetElementAt(i).QueryInterface(Ci.nsIMsgAccount));
      }
    } else if (accounts instanceof Ci.nsIArray) {
      for (let i = 0, maxi = accounts.length; i < maxi; i++) {
        accountsArray.push(accounts.queryElementAt(i, Ci.nsIMsgAccount));
      }
    }
    return accountsArray;
  },

  getServer: function CheckNewMessagesInAllFolders_getServer(aKey) {
    var foundServer;
    this.allAccounts.some(function(aAccount) {
      aAccount = aAccount.QueryInterface(Ci.nsIMsgAccount);
      var server = aAccount.incomingServer;
      if (server.key == aKey)
        return foundServer = server;
    }, this);
    return foundServer;
  },

  isAllChecked: function CheckNewMessagesInAllFolders_isAllChecked(aAccount) {
    const nsMsgFolderFlags = Ci.nsMsgFolderFlags;
    var server = aAccount.incomingServer;
    var unchecked = this.forEachFolder(server.rootFolder, function(aFolder) {
/*
      dump('CHECK '+aFolder.URI+' / '+aFolder.flags+'\n');
      for (var i in nsMsgFolderFlags) {
        if (typeof nsMsgFolderFlags[i] == 'number' &&
            aFolder.flags & nsMsgFolderFlags[i])
          dump('  ' + i+'\n');
      }
*/
      return !(aFolder.flags & nsMsgFolderFlags.CheckNew);
    });
    return !unchecked;
  },

  forEachFolder: function CheckNewMessagesInAllFolders_forEachFolder(aRoot, aCallback) {
    if ('descendants' in aRoot) { // Thunderbird 24
      let folders = aRoot.descendants;
      for (let i = 0, maxi = folders.length; i < maxi; i++) {
        let folder = folders.queryElementAt(i, Ci.nsIMsgFolder);
        if (folder.flags & nsMsgFolderFlags.Inbox ||
            folder.flags & nsMsgFolderFlags.Virtual)
          continue;
        if (aCallback(folder)) {
          return true;
        }
      }
    } else { // Thunderbird 17 or olders
      let folders = Cc['@mozilla.org/supports-array;1']
                      .createInstance(Ci.nsISupportsArray);
      aRoot.ListDescendents(folders);
      for (let i = 0, maxi = folders.Count(); i < maxi; i++) {
        let folder = folders.GetElementAt(i).QueryInterface(Ci.nsIMsgFolder);
        if (folder.flags & nsMsgFolderFlags.Inbox ||
            folder.flags & nsMsgFolderFlags.Virtual)
          continue;
        if (aCallback(folder))
          return true;
      }
    }
    return false;
  }
};
