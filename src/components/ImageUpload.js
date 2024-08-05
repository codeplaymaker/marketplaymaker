import React, { useState } from 'react';
import { storage } from '../firebase';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import styled from 'styled-components';

const UploadContainer = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
`;

const UploadButton = styled.button`
  padding: 0.5rem 1rem;
  background-color: #000;
  color: #fff;
  border: none;
  cursor: pointer;
  margin-top: 1rem;
  &:hover {
    background-color: #333;
  }
`;

const ImageUpload = ({ onUpload }) => {
  const [image, setImage] = useState(null);
  const [url, setUrl] = useState('');

  const handleChange = (e) => {
    if (e.target.files[0]) {
      setImage(e.target.files[0]);
    }
  };

  const handleUpload = () => {
    const storageRef = ref(storage, `images/${image.name}`);
    uploadBytes(storageRef, image).then((snapshot) => {
      getDownloadURL(snapshot.ref).then((url) => {
        setUrl(url);
        onUpload(url);
      });
    });
  };

  return (
    <UploadContainer>
      <input type="file" onChange={handleChange} />
      <UploadButton onClick={handleUpload}>Upload</UploadButton>
      {url && <img src={url} alt="Uploaded" style={{ width: '100px', marginTop: '1rem', objectFit: 'contain' }} />}
    </UploadContainer>
  );
};

export default ImageUpload;
