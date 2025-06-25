'use client';

import React from 'react';
import { Modal, Button } from 'react-bootstrap';

interface ContactModalProps {
  show: boolean;
  onHide: () => void;
}

/**
 * ContactModal component displays contact information in a modal dialog
 * 
 * @param show - Controls visibility of the modal
 * @param onHide - Callback when modal is closed
 * @returns React component
 */
export const ContactModal: React.FC<ContactModalProps> = ({ show, onHide }) => {
  return (
    <Modal show={show} onHide={onHide} centered>
      <Modal.Header closeButton>
        <Modal.Title>聯絡我們</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <p>請通過以下電子郵件地址聯繫我們：</p>
        <p className="text-primary">windo.ac@gmail.com</p>
      </Modal.Body>
      <Modal.Footer>
        <Button variant="secondary" onClick={onHide}>
          關閉
        </Button>
      </Modal.Footer>
    </Modal>
  );
};

/**
 * ContactButton component renders a button to open the contact modal
 * @param onClick - function to call when button is clicked
 * @returns React component
 */
export const ContactButton: React.FC<{ onClick: () => void }> = ({ onClick }) => (
  <Button
    variant="link"
    size="sm"
    onClick={onClick}
    className="text-decoration-none"
  >
    <i className="fas fa-envelope me-1"></i>
    聯繫客服
  </Button>
);