import React, {Component} from 'react';
import Modal from 'react-modal';

import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faTimes, faUpload } from '@fortawesome/free-solid-svg-icons'
import { t } from '../functions/lang'


/**
 * The upload party model, which pops up when clicking the Upload Party
 * button at the top.
 * @property {String} partyString The string that the user has entered into the box.
 * @property {String} error The current error message, if any.
 */
class UploadPartyModal extends Component {

  constructor(props) {
    super(props);
    this.state = {
      partyString: "",
      error: null,
    }
  }

  /**
   * Handle the "upload" of a party string.
   * Do this by calling the function from props and checking for errors.
   */
  handleUploadPartyString() {
    this.props.uploadPartyFromString(this.state.partyString, function(err) {
      if(err) {
        this.setState({
          error: err.message,
        });
      } else {
        this.setState( {
          partyString: "",
          error: null,
        });
      }
    }.bind(this));
  }

  /**
   * Handle the input change for the textarea.
   * @param  {Event} e The event that sparked this function.
   */
  handleInputChange(e) {
    this.setState({
      error: null,
      partyString: e.target.value,
    });
  }

  /**
   * The render function.
   * @return {ReactComponent} The modal.
   */
  render() {
    return (

      <Modal className="modal-content modal-content-info modal-sm" overlayClassName="modal-overlay modal-overlay-info is-open" isOpen={this.props.modalIsOpen}>
        <div className="modal-header">
          <button id="close-upload-party-modal" className="modal-close" onClick={this.props.closeModal}><FontAwesomeIcon icon={faTimes} /></button>
        </div>
        <div className="info-modal">
          <h2>{t("上传队伍", "Upload party")}</h2>
          <p>
            {t(
              "把游戏导出的队伍字符串粘贴到下面的框里，然后点「上传」。游戏内获取方式：选项 → 导出数据到剪贴板。也可以粘贴官方 Planner 的分享链接（?b=...）。",
              'Paste your party string into the box below and click "upload" to upload your party. You can get your build string in-game by going to Options and then Export Data to Clipboard.'
            )}
          </p>
          { this.state.error && <div className="notification notification-error"><b>Error: </b>{this.state.error}</div>}
          <textarea autoFocus id="upload-party-textarea" placeholder={t("把队伍字符串 / Planner 分享链接粘贴到这里", "Paste party string here")} onChange={(e) => this.handleInputChange(e)} value={this.state.partyString}></textarea>
          <button id="upload-party-button" className="button-lg" onClick={this.handleUploadPartyString.bind(this)}><FontAwesomeIcon icon={faUpload}/>&nbsp;{t("上传", "Upload")}</button>
        </div>
      </Modal>
    )
  }
}

export default UploadPartyModal;