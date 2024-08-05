import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import { collection, addDoc, getDocs, deleteDoc, doc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase';
import ImageUpload from './ImageUpload';

const Section = styled.section`
  padding: 4rem 2rem;
  background-color: #f4f4f9;
`;

const Heading = styled.h1`
  font-size: 2.5rem;
  margin-bottom: 2rem;
  color: #333;
`;

const Form = styled.form`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1.5rem;
  margin-bottom: 3rem;
  background: #fff;
  padding: 2rem;
  border-radius: 8px;
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
`;

const Input = styled.input`
  padding: 0.75rem;
  width: 100%;
  max-width: 400px;
  border: 1px solid #ddd;
  border-radius: 8px;
`;

const TextArea = styled.textarea`
  padding: 0.75rem;
  width: 100%;
  max-width: 400px;
  border: 1px solid #ddd;
  border-radius: 8px;
  resize: vertical;
`;

const Button = styled.button`
  padding: 0.75rem 2rem;
  background-color: #000; /* Black background */
  color: #fff;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  margin-top: 1rem;
  font-size: 1rem;
  transition: background-color 0.3s;

  &:hover {
    background-color: #333; /* Darker black on hover */
  }
`;

const ElementsContainer = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 2rem;
  justify-content: center;
`;

const ElementCard = styled.div`
  background-color: #fff;
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  padding: 1.5rem;
  width: 300px;
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
  text-align: left;
  display: flex;
  flex-direction: column;
  align-items: center;
`;

const CardImage = styled.img`
  width: 100%;
  height: auto;
  object-fit: cover;
  border-radius: 8px;
  margin-bottom: 1rem;
`;

const ElementTitle = styled.h3`
  font-size: 1.5rem;
  margin-bottom: 0.5rem;
  color: #333;
`;

const ElementDate = styled.p`
  font-size: 0.9rem;
  color: #555;
  margin-bottom: 0.5rem;
`;

const ElementContent = styled.p`
  font-size: 1rem;
  color: #333;
  text-align: center;
  margin-bottom: 1rem;
`;

const ElementStockSymbol = styled.p`
  font-size: 0.9rem;
  color: #888;
  margin-bottom: 1rem;
`;

const Admin = () => {
  const [data, setData] = useState([]);
  const [newElement, setNewElement] = useState({
    title: '',
    date: '',
    content: '',
    image: '',
    stockSymbol: ''
  });
  const [isEditing, setIsEditing] = useState(false);
  const [currentId, setCurrentId] = useState(null);

  const fetchDashboardData = async () => {
    const querySnapshot = await getDocs(collection(db, 'dashboard'));
    const dashboardData = [];
    querySnapshot.forEach((doc) => {
      dashboardData.push({ id: doc.id, ...doc.data() });
    });
    setData(dashboardData);
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setNewElement({ ...newElement, [name]: value });
  };

  const handleImageUpload = (url) => {
    setNewElement({ ...newElement, image: url });
  };

  const handleAddOrUpdateElement = async (e) => {
    e.preventDefault();
    if (isEditing) {
      await updateDoc(doc(db, 'dashboard', currentId), newElement);
      setIsEditing(false);
      setCurrentId(null);
    } else {
      await addDoc(collection(db, 'dashboard'), newElement);
    }
    setNewElement({
      title: '',
      date: '',
      content: '',
      image: '',
      stockSymbol: ''
    });
    fetchDashboardData();
  };

  const handleEditElement = (item) => {
    setNewElement(item);
    setIsEditing(true);
    setCurrentId(item.id);
  };

  const handleDeleteElement = async (id) => {
    await deleteDoc(doc(db, 'dashboard', id));
    fetchDashboardData();
  };

  const [blogData, setBlogData] = useState([]);
  const [newBlog, setNewBlog] = useState({
    title: '',
    date: '',
    author: '',
    description: '',
    image: ''
  });

  const fetchBlogData = async () => {
    const querySnapshot = await getDocs(collection(db, 'blogPosts'));
    const blogPosts = [];
    querySnapshot.forEach((doc) => {
      blogPosts.push({ id: doc.id, ...doc.data() });
    });
    setBlogData(blogPosts);
  };

  useEffect(() => {
    fetchBlogData();
  }, []);

  const handleBlogInputChange = (e) => {
    const { name, value } = e.target;
    setNewBlog({ ...newBlog, [name]: value });
  };

  const handleBlogImageUpload = (url) => {
    setNewBlog({ ...newBlog, image: url });
  };

  const handleAddOrUpdateBlog = async (e) => {
    e.preventDefault();
    if (isEditing) {
      await updateDoc(doc(db, 'blogPosts', currentId), newBlog);
      setIsEditing(false);
      setCurrentId(null);
    } else {
      await addDoc(collection(db, 'blogPosts'), newBlog);
    }
    setNewBlog({
      title: '',
      date: '',
      author: '',
      description: '',
      image: ''
    });
    fetchBlogData();
  };

  const handleEditBlog = (item) => {
    setNewBlog(item);
    setIsEditing(true);
    setCurrentId(item.id);
  };

  const handleDeleteBlog = async (id) => {
    await deleteDoc(doc(db, 'blogPosts', id));
    fetchBlogData();
  };

  return (
    <Section>
      <Heading>Admin Page</Heading>

      <Form onSubmit={handleAddOrUpdateElement}>
        <Input
          type="text"
          name="title"
          placeholder="Title"
          value={newElement.title}
          onChange={handleInputChange}
        />
        <Input
          type="date"
          name="date"
          value={newElement.date}
          onChange={handleInputChange}
        />
        <TextArea
          name="content"
          placeholder="Content"
          value={newElement.content}
          onChange={handleInputChange}
        />
        <Input
          type="text"
          name="stockSymbol"
          placeholder="Stock Symbol"
          value={newElement.stockSymbol}
          onChange={handleInputChange}
        />
        <ImageUpload onUpload={handleImageUpload} />
        <Button type="submit">{isEditing ? 'Update Element' : 'Add Element'}</Button>
      </Form>

      <Heading>Current Elements</Heading>
      <ElementsContainer>
        {data.map((item) => (
          <ElementCard key={item.id}>
            <CardImage src={item.image} alt={item.title} />
            <ElementTitle>{item.title}</ElementTitle>
            <ElementDate>{item.date}</ElementDate>
            <ElementContent>{item.content}</ElementContent>
            <ElementStockSymbol>{item.stockSymbol}</ElementStockSymbol>
            <Button onClick={() => handleEditElement(item)}>Edit</Button>
            <Button onClick={() => handleDeleteElement(item.id)}>Delete</Button>
          </ElementCard>
        ))}
      </ElementsContainer>

      <Heading>Blog Management</Heading>
      <Form onSubmit={handleAddOrUpdateBlog}>
        <Input
          type="text"
          name="title"
          placeholder="Title"
          value={newBlog.title}
          onChange={handleBlogInputChange}
        />
        <Input
          type="date"
          name="date"
          value={newBlog.date}
          onChange={handleBlogInputChange}
        />
        <Input
          type="text"
          name="author"
          placeholder="Author"
          value={newBlog.author}
          onChange={handleBlogInputChange}
        />
        <TextArea
          name="description"
          placeholder="Description"
          value={newBlog.description}
          onChange={handleBlogInputChange}
        />
        <ImageUpload onUpload={handleBlogImageUpload} />
        <Button type="submit">{isEditing ? 'Update Blog' : 'Add Blog'}</Button>
      </Form>

      <Heading>Current Blog Posts</Heading>
      <ElementsContainer>
        {blogData.map((item) => (
          <ElementCard key={item.id}>
            <CardImage src={item.image} alt={item.title} />
            <ElementTitle>{item.title}</ElementTitle>
            <ElementDate>{item.date}</ElementDate>
            <ElementContent>{item.description}</ElementContent>
            <ElementStockSymbol>{item.author}</ElementStockSymbol>
            <Button onClick={() => handleEditBlog(item)}>Edit</Button>
            <Button onClick={() => handleDeleteBlog(item.id)}>Delete</Button>
          </ElementCard>
        ))}
      </ElementsContainer>
    </Section>
  );
};

export default Admin;
