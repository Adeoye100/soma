import React, { useState, useEffect } from 'react';
import styled, { keyframes } from 'styled-components';

const SupportCard: React.FC = () => {
  const [isCopied, setIsCopied] = useState(false);
  const [toastVisible, setToastVisible] = useState(false);
  const [showInteractiveModal, setShowInteractiveModal] = useState(false);
  const [cardBounce, setCardBounce] = useState(false);
  const cardNumber = '812406850099';
  const formattedCardNumber = '812 4068 599';
  const accountName = 'Emmanuel Opeyemi';

  const copyCardNumber = () => {
    if (isCopied) return;
    navigator.clipboard.writeText(cardNumber);
    setIsCopied(true);
    setToastVisible(true);
    setShowInteractiveModal(true);
    setCardBounce(true);

    setTimeout(() => {
      setCardBounce(false);
    }, 600);

    setTimeout(() => {
      setIsCopied(false);
      setToastVisible(false);
      setShowInteractiveModal(false);
    }, 4000);
  };

  const handleModalAction = (action: string) => {
    console.log(`Action taken: ${action}`);
    setShowInteractiveModal(false);
  };

  return (
    <>
      <CardContainer className={cardBounce ? 'bounce' : ''}>
        <div className="border">
          <div className="card">
            <div className="shadow">
              <div className="content">
                <p className="rev">Soma</p>
                <p className="ultra-text">Support</p>
                <AccountName className="account-name">{accountName}</AccountName>
                <svg version="1.1" className="chip" xmlns="http://www.w3.org/2000/svg" x="0px" y="0px" width="40px" height="40px" viewBox="0 0 50 50" xmlSpace="preserve">
                  <image width="50" height="50" x="0" y="0" href="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADIAAAAyCAMAAAAp4XiDAAAABGdBTUEAALGPC/xhBQAAACBjSFJNAAB6JgAAgIQAAPoAAACA6AAAdTAAAOpgAAA6mAAAF3CculE8AAAB6VBMVEUAAACNcTiVeUKVeUOYfEaafEeUeUSYfEWZfEaykleyklaXe0SWekSZZjOYfEWYe0WXfUWXe0WcgEicfkiXe0SVekSXekSWekKYe0a9nF67m12ZfUWUeEaXfESVekOdgEmVeUWWekSniU+VeUKVeUOrjFKYfEWliE6WeESZe0GSe0WYfES7ml2Xe0WXeESUeEOWfEWcf0eWfESXe0SXfEWYekSVeUKXfEWxklawkVaZfEWWekOUekOWekSYfESZe0eXekWYfEWZe0WZe0eVeUSWeETAnmDCoWLJpmbxy4P1zoXwyoLIpWbjvXjivnjgu3bfu3beunWvkFWxkle/nmDivXiWekTnwXvkwHrCoWOuj1SXe0TEo2TDo2PlwHratnKZfEbQrWvPrWua fUfbt3PJp2agg0v0zYX0zYSfgkvKp2frxX7mwHrlv3rsxn/yzIPgvHfduXWXe0XuyIDzzISsjVO1lVm0lFitjVPzzIPqxX7duna0lVncuHTLqGjvyIHeuXXxyYGZfUayk1iyk1e2lln1zYTEomO2llrb tnMafkjFpGSbfkfZtXLhvHfkv3nqxH3mwXujhU3KqWizlFilh06khk2fgkqsjlPHpWXJp2erjVOhg0yWe0SliE+XekShhEvAn2D///+gx8TWAAAARnRSTlMACVCTtsRl7Pv7+vxkBab7pZv5+ZlL/UnU/f3SJCVe+Fx39naA9/75XSMh0/3SSkia+pil/KRj7Pr662JPkrbP7OLQ0JFOijI1MwAAAAFiS0dEorDd34wAAAAJcEhZcwAACxMAAAsTAQCanBgAAAAHdElNRQfnAg0IDx2lsiuJAAACLElEQVRIx2NgGAXkAUYmZhZWPICFmYkRVQcbOwenmzse4MbFzc6DpIGXj8PD04sA8PbhF+CFaxEU8iWkAQT8hEVgOkTF/InR4eUVICYO1SIhCRMLDAoKDvFDVhUaEhwUFAjjSUlDdMiEhcOEItzdI6OiYxA6YqODIt3dI2DcuDBZsBY5eVTr4xMSYcyk5BRUOXkFsBZFJTQnp6alQxgZmVloUkrKYC0qqmji2WE5EEZuWB6alKoKdi35YQUQRkFYPpFaCouKIYzi6EDitJSUlsGY5RWVRGjJLyxNy4ZxqtIqqvOxaVELQwZFZdkIJVU1RSiSalAt6rUwUBdWG1CP6pT6gNqwOrgCdQyHNYR5YQFhDXj8MiK1IAeyN6aORiyBjByVTc0FqBoKWpqwRCVSgilOaY2OaUPw29qjOzqLvTAchpos47u6EZyYnngUSRwpuTe6D+6qaFQdOPNLRzOM1dzhRZyW+CZouHk3dWLXglFcFIflQhj9YWjJGlZcaKAVSvjyPrRQ0oQVKDAQHlYFYUwIm4gqExGmBSkutaVQJeomwViTJqPK6OhCy2Q9sQBk8cY0DxjTJw0lAQWK6cOKfgNhpKK7ZMpUeF3jPa28BCETamiEqJKM+X1gxvWXpoUjVIVPnwErw71nmpgiqiQGBjNzbgs3j1nus+fMndc+Cwm0T52/oNR9lsdCS24ra7Tq1cbWjpXV3sHRCb1idXZ0sGdltXNxRateRwHRAACYHutzk/2I5QAAACV0RVh0ZGF0ZTpjcmVhdGUAMjAyMy0wMi0xM1QwODoxNToyOSswMDowMEUnN7UAAAAldEVYdGRhdGU6bW9kaWZ5ADIwMjMtMDItMTNUMDg6MTU6MjkrMDA6MDA0eo8JAAAAKHRFWHRkYXRlOnRpbWVzdGFtcAAyMDIzLTAyLTEzVDA4OjE1OjI5KzAwOjAwY2+u1gAAAABJRU5ErkJggg==" />
                </svg>
                <div className="card-number-area">
                  <span className="card-number">{formattedCardNumber}</span>
                  <button className="copy-btn" onClick={copyCardNumber} title="Copy account number" disabled={isCopied}>
                    {isCopied ? (
                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
                        <path d="M13.854 3.646a.5.5 0 0 1 0 .708l-7 7a.5.5 0 0 1-.708 0l-3.5-3.5a.5.5 0 1 1 .708-.708L6.5 10.293l6.646-6.647a.5.5 0 0 1 .708 0z"/>
                      </svg>
                    ) : (
                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
                        <path d="M4 1.5H3a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2V10h-1v1.5a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1v-8a1 1 0 0 1 1-1h1V1.5z"/>
                        <path d="M5.5 1A1.5 1.5 0 0 1 7 2.5V3h5.5A1.5 1.5 0 0 1 14 4.5v5.5a1.5 1.5 0 0 1-1.5 1.5h-1v-1h1a.5.5 0 0 0 .5-.5V4.5a.5.5 0 0 0-.5-.5H7v-.5A1.5 1.5 0 0 1 5.5 1z"/>
                      </svg>
                    )}
                  </button>
                </div>
                <p className="master-text">Moniepoint</p>
              </div>
            </div>
          </div>
        </div>
      </CardContainer>

      {/* Enhanced Toast Message */}
      <CopyToast className={toastVisible ? 'visible' : ''}>
        <div className="toast-content">
          <span className="toast-icon">✓</span>
          Account number copied successfully!
          <button className="toast-close" onClick={() => setToastVisible(false)}>×</button>
        </div>
      </CopyToast>

      {/* Interactive Modal */}
      <InteractiveModal className={showInteractiveModal ? 'show' : ''}>
        <ModalOverlay onClick={() => setShowInteractiveModal(false)} />
        <ModalContent>
          <ModalHeader>
            <h3>Account Details Copied!</h3>
            <button className="modal-close" onClick={() => setShowInteractiveModal(false)}>×</button>
          </ModalHeader>
          <ModalBody>
            <div className="account-info">
              <p><strong>Account Name:</strong> {accountName}</p>
              <p><strong>Account Number:</strong> {formattedCardNumber}</p>
              <p><strong>Bank:</strong> Moniepoint</p>
            </div>
            <div className="modal-actions">
              <ActionButton onClick={() => handleModalAction('share')}>
                <span>📤</span> Share Details
              </ActionButton>
              <ActionButton onClick={() => handleModalAction('donate')}>
                <span>💝</span> Make Donation
              </ActionButton>
            </div>
          </ModalBody>
        </ModalContent>
      </InteractiveModal>
    </>
  );
};

const rotate = keyframes`
  0% {
    transform: translate(-25em, -15em);
  }
  20% {
    transform: translate(25em, 15em);
  }
  100% {
    transform: translate(25em, 15em);
  }
`;

const bounce = keyframes`
  0% {
    transform: scale(1) rotateY(0deg);
  }
  25% {
    transform: scale(1.05) rotateY(5deg) translateY(-5px);
  }
  50% {
    transform: scale(1.1) rotateY(-5deg) translateY(-10px);
  }
  75% {
    transform: scale(1.05) rotateY(3deg) translateY(-5px);
  }
  100% {
    transform: scale(1) rotateY(0deg);
  }
`;

const slideIn = keyframes`
  from {
    opacity: 0;
    transform: translate(-50%, 30px);
  }
  to {
    opacity: 1;
    transform: translate(-50%, 0);
  }
`;

const modalSlide = keyframes`
  from {
    opacity: 0;
    transform: translate(-50%, -50%) scale(0.8);
  }
  to {
    opacity: 1;
    transform: translate(-50%, -50%) scale(1);
  }
`;

const CardContainer = styled.div`
    font-family: "Trebuchet MS", sans-serif;
    position: relative;
    height: 203px;
    aspect-ratio: 1.579;
    border-radius: 18px;
    overflow: hidden;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 300ms ease-in;
    margin: 1rem auto 0;

    &.bounce {
        animation: ${bounce} 0.6s ease-in-out;
    }

    &:hover {
        transform: rotateZ(1deg) rotateY(10deg) scale(1.1);
        box-shadow: 0 5em 2em #111;
    }

    .border {
      display: flex;
      align-items: center;
      justify-content: center;
      border-radius: 1em;
      background: linear-gradient(
        115deg,
        rgba(0, 0, 0, 0.33) 12%,
        rgba(255, 255, 255, 0.33) 27%,
        rgba(255, 255, 255, 0.33) 31%,
        rgba(0, 0, 0, 0.33) 52%
      );

      &:hover:after {
        position: absolute;
        content: " ";
        height: 50em;
        aspect-ratio: 1.58;
        border-radius: 1em;
        background: linear-gradient(
          115deg,
          rgba(0, 0, 0, 1) 42%,
          rgba(255, 255, 255, 1) 47%,
          rgba(255, 255, 255, 1) 51%,
          rgba(0, 0, 0, 1) 52%
        );
        animation: ${rotate} 4s linear infinite;
        z-index: 1;
        opacity: 0.05;
      }
    }

    .card {
      height: 12.5em;
      aspect-ratio: 1.586;
      border-radius: 1em;
      background-color: #999;
      opacity: 0.8;
      background-image: linear-gradient(to right, #777, #777 2px, #999 2px, #999);
      background-size: 4px 100%;
    }

    .shadow {
      position: relative;
      width: 100%;
      height: 100%;
      border-radius: 0.85em;
      border: 1px solid #bbb;
      background:
        radial-gradient(circle at 100% 100%, #ffffff 0, #ffffff 8px, transparent 8px) 0% 0%/13px 13px no-repeat,
        radial-gradient(circle at 0 100%, #ffffff 0, #ffffff 8px, transparent 8px) 100% 0%/13px 13px no-repeat,
        radial-gradient(circle at 100% 0, #ffffff 0, #ffffff 8px, transparent 8px) 0% 100%/13px 13px no-repeat,
        radial-gradient(circle at 0 0, #ffffff 0, #ffffff 8px, transparent 8px) 100% 100%/13px 13px no-repeat,
        linear-gradient(#ffffff, #ffffff) 50% 50% / calc(100% - 10px) calc(100% - 26px) no-repeat,
        linear-gradient(#ffffff, #ffffff) 50% 50% / calc(100% - 26px) calc(100% - 10px) no-repeat,
        linear-gradient(135deg, rgba(3, 3, 3, 0.5) 0%, transparent 22%, transparent 47%, transparent 73%, rgba(0, 0, 0, 0.5) 100%);
      box-sizing: border-box;
    }

    .content {
      position: absolute;
      top: 50%;
      left: 50%;
      border-radius: 0.6em;
      border: 1px solid #aaa;
      box-shadow: -1px -1px 0 #ddd;
      transform: translate(-50%, -50%);
      height: 12em;
      aspect-ratio: 1.604;
      background-image: linear-gradient(to right, #777, #555 2px, #aaa 2px, #aaa);
      background-size: 4px 100%;
    }

    .rev, .ultra-text, .master-text {
      position: absolute;
      text-shadow: -1px -1px #333;
      color: #fff;
      opacity: 0.75;
    }

    .rev {
      top: 0.5em;
      left: 0.75em;
      color: #ffffff9f;
      font-size: 1.25em;
    }

    .ultra-text {
      top: 2.25em;
      left: 0.75em;
      font-size: 0.65em;
      color: rgba(255, 255, 255, 0.66);
    }

    .chip {
      position: absolute;
      top: 27.5%;
      left: 8.25%;
    }

    .card-number-area {
        position: absolute;
        top: 55%;
        left: 50%;
        transform: translateX(-50%);
        width: 100%;
        display: flex;
        justify-content: center;
        align-items: center;
        gap: 10px;
    }

     .card-number {
      font-family: "JetBrains Mono", monospace;
      font-size: 1.1rem;
      font-weight: 600;
      letter-spacing: 1px;
      color: #fff;
      text-shadow: -1px -1px #333;
      opacity: 0.75;
      user-select: none;
    }

    .copy-btn {
      background: none;
      border: none;
      color: #fff;
      cursor: pointer;
      transition: .2s;
      opacity: 0.75;
      padding: 4px;

      &:hover {
          opacity: 1;
          transform: scale(1.15);
      }

      &:disabled {
          cursor: default;
          opacity: 1;
      }
    }

    .master-text {
      bottom: 0.75em;
      right: 0.8em;
      font-size: 0.75em;
    }
`;

const CopyToast = styled.div`
    position: fixed;
    bottom: 40px;
    left: 50%;
    background: linear-gradient(135deg, #2c3e50, #3498db);
    padding: 12px 20px;
    border-radius: 8px;
    color: #fff;
    opacity: 0;
    transform: translate(-50%, 50px);
    transition: opacity .3s ease-in-out, transform .3s ease-in-out;
    font-size: .9rem;
    z-index: 100;
    box-shadow: 0 4px 20px rgba(52, 152, 219, 0.3);

    &.visible {
        opacity: 1;
        transform: translate(-50%, 0);
        animation: ${slideIn} 0.3s ease-out;
    }

    .toast-content {
        display: flex;
        align-items: center;
        gap: 10px;
    }

    .toast-icon {
        background: #2ecc71;
        color: white;
        border-radius: 50%;
        width: 20px;
        height: 20px;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 12px;
        font-weight: bold;
    }

    .toast-close {
        background: none;
        border: none;
        color: white;
        font-size: 18px;
        cursor: pointer;
        margin-left: auto;
        opacity: 0.7;
        transition: opacity 0.2s;

        &:hover {
            opacity: 1;
        }
    }
`;

// Styled Components for Interactive Modal
const InteractiveModal = styled.div`
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    z-index: 1000;
    display: flex;
    align-items: center;
    justify-content: center;
    opacity: 0;
    visibility: hidden;
    transition: all 0.3s ease-in-out;

    &.show {
        opacity: 1;
        visibility: visible;
    }
`;

const ModalOverlay = styled.div`
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(0, 0, 0, 0.5);
    backdrop-filter: blur(5px);
`;

const ModalContent = styled.div`
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    border-radius: 16px;
    padding: 0;
    max-width: 400px;
    width: 90%;
    box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
    color: white;
    animation: ${modalSlide} 0.3s ease-out;
    overflow: hidden;
`;

const ModalHeader = styled.div`
    padding: 20px;
    border-bottom: 1px solid rgba(255, 255, 255, 0.1);
    display: flex;
    justify-content: space-between;
    align-items: center;
    background: rgba(255, 255, 255, 0.05);

    h3 {
        margin: 0;
        font-size: 1.2rem;
        font-weight: 600;
    }

    .modal-close {
        background: none;
        border: none;
        color: white;
        font-size: 24px;
        cursor: pointer;
        opacity: 0.7;
        transition: opacity 0.2s;
        width: 30px;
        height: 30px;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;

        &:hover {
            opacity: 1;
            background: rgba(255, 255, 255, 0.1);
        }
    }
`;

const ModalBody = styled.div`
    padding: 20px;

    .account-info {
        margin-bottom: 20px;

        p {
            margin: 8px 0;
            font-size: 0.95rem;
            display: flex;
            justify-content: space-between;
            align-items: center;
        }

        strong {
            font-weight: 600;
        }
    }

    .modal-actions {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 12px;
    }
`;

const ActionButton = styled.button`
    background: rgba(255, 255, 255, 0.15);
    border: 1px solid rgba(255, 255, 255, 0.2);
    border-radius: 8px;
    padding: 12px 16px;
    color: white;
    cursor: pointer;
    font-size: 0.9rem;
    transition: all 0.2s ease;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    font-weight: 500;

    &:hover {
        background: rgba(255, 255, 255, 0.25);
        transform: translateY(-2px);
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
    }

    span {
        font-size: 1.1rem;
    }
`;

const AccountName = styled.span`
    position: absolute;
    top: 3.2em;
    left: 0.75em;
    font-size: 0.75em;
    color: #fff;
    font-weight: 500;
    text-shadow: -1px -1px #333;
    opacity: 0.85;
`;

export default SupportCard;
