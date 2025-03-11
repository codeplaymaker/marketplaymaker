import React, { useState, useEffect } from 'react';
import styled from 'styled-components';

const Container = styled.div`
  max-width: 600px;
  margin: 0 auto;
  padding: 20px;
`;

const TradePlanWrapper = styled.div`
  border: 1px solid #ddd;
  padding: 15px;
  margin-bottom: 20px;
  border-radius: 8px;
  background-color: #f9f9f9;
  display: flex;
  align-items: center;
  gap: 10px;
`;

const TaskInput = styled.input`
  width: 80%;
  padding: 8px;
  border: 1px solid #ccc;
  border-radius: 4px;
  outline: none;

  &:focus {
    border-color: #007bff;
  }
`;

const TaskList = styled.ul`
  list-style-type: none;
  padding: 0;
`;

const TaskItem = styled.li`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px;
  margin-bottom: 10px;
  background-color: ${props => (props.completed ? '#d4edda' : '#fff')};
  border: 1px solid ${props => (props.completed ? '#c3e6cb' : '#ddd')};
  border-radius: 4px;
  transition: background-color 0.3s, border-color 0.3s;
`;

const TaskText = styled.span`
  text-decoration: ${props => (props.completed ? 'line-through' : 'none')};
  flex-grow: 1;
`;

const Checkbox = styled.input`
  margin-right: 10px;
`;

const Button = styled.button`
  padding: 8px 12px;
  color: #fff;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  transition: background-color 0.3s, box-shadow 0.3s;
  font-size: 14px;

  &:hover {
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
  }
`;

const AddTaskButton = styled(Button)`
  background-color: #000;
  margin-top: 10px;

  &:hover {
    background-color: #333;
  }
`;

const SavePlanButton = styled(Button)`
  background-color: #000;
  margin-top: 10px;

  &:hover {
    background-color: #333;
  }
`;

const ResetButton = styled(Button)`
  background-color: #000;
  margin-top: 10px;

  &:hover {
    background-color: #333;
  }
`;

const DeletePlanButton = styled(Button)`
  background-color: #ff4136;
  margin-left: 10px;
  margin-top: 5px;

  &:hover {
    background-color: #ff1100;
  }
`;

const TaskDeleteButton = styled(Button)`
  background-color: #ff4136;
  font-size: 12px;

  &:hover {
    background-color: #ff1100;
  }
`;

const TradePlanComponent = () => {
  const [tasks, setTasks] = useState([]);
  const [newTask, setNewTask] = useState('');
  const [planName, setPlanName] = useState('');
  const [savedPlans, setSavedPlans] = useState([]);
  const [selectedPlan, setSelectedPlan] = useState(null);

  useEffect(() => {
    const plans = JSON.parse(localStorage.getItem('tradePlans')) || [];
    setSavedPlans(plans);
  }, []);

  useEffect(() => {
    if (savedPlans.length > 0) {
      localStorage.setItem('tradePlans', JSON.stringify(savedPlans));
    }
  }, [savedPlans]);

  const addTask = () => {
    if (newTask.trim() !== '') {
      setTasks([...tasks, { text: newTask, completed: false }]);
      setNewTask('');
    } else {
      alert('Task name cannot be empty.');
    }
  };

  const toggleTaskCompletion = (index) => {
    const updatedTasks = tasks.map((task, i) =>
      i === index ? { ...task, completed: !task.completed } : task
    );
    setTasks(updatedTasks);
  };

  const deleteTask = (index) => {
    const updatedTasks = tasks.filter((_, i) => i !== index);
    setTasks(updatedTasks);
  };

  const savePlan = () => {
    if (planName.trim() === '') {
      alert('Plan name cannot be empty.');
      return;
    }
    const planExists = savedPlans.some(plan => plan.name === planName.trim());
    if (planExists) {
      alert('A plan with this name already exists.');
      return;
    }
    const newPlan = { name: planName, tasks };
    setSavedPlans([...savedPlans, newPlan]);
    setPlanName('');
    setTasks([]);
  };

  const loadPlan = (plan) => {
    setSelectedPlan(plan);
    setTasks(plan.tasks);
  };

  const deletePlan = (index) => {
    const confirmed = window.confirm('Are you sure you want to delete this plan?');
    if (!confirmed) return;

    const updatedPlans = savedPlans.filter((_, i) => i !== index);
    setSavedPlans(updatedPlans);

    localStorage.setItem('tradePlans', JSON.stringify(updatedPlans));

    if (selectedPlan && selectedPlan === savedPlans[index]) {
      setSelectedPlan(null);
      setTasks([]);
    }
  };

  const resetTasks = () => {
    const updatedTasks = tasks.map(task => ({ ...task, completed: false }));
    setTasks(updatedTasks);
  };

  return (
    <Container>
      <h2>Trade Plan Manager</h2>
      <p>Fail to plan, you plan to fail.</p>
      <TradePlanWrapper>
        <TaskInput
          type="text"
          value={newTask}
          onChange={(e) => setNewTask(e.target.value)}
          placeholder="Add a new task..."
        />
        <AddTaskButton onClick={addTask}>Add Task</AddTaskButton>
      </TradePlanWrapper>

      <TradePlanWrapper>
        <TaskInput
          type="text"
          value={planName}
          onChange={(e) => setPlanName(e.target.value)}
          placeholder="Enter plan name..."
        />
        <SavePlanButton onClick={savePlan}>Save Plan</SavePlanButton>
      </TradePlanWrapper>

      {tasks.length === 0 ? (
        <p>No tasks added yet. Start by adding your first task!</p>
      ) : (
        <>
          <TaskList>
            {tasks.map((task, index) => (
              <TaskItem key={index} completed={task.completed}>
                <Checkbox
                  type="checkbox"
                  checked={task.completed}
                  onChange={() => toggleTaskCompletion(index)}
                />
                <TaskText completed={task.completed}>{task.text}</TaskText>
                <TaskDeleteButton onClick={() => deleteTask(index)}>Delete</TaskDeleteButton>
              </TaskItem>
            ))}
          </TaskList>
          <ResetButton onClick={resetTasks}>Reset All Tasks</ResetButton>
        </>
      )}

      {savedPlans.length > 0 && (
        <TradePlanWrapper>
          <h3>Saved Trade Plans</h3>
          <ul>
            {savedPlans.map((plan, index) => (
              <li key={index} style={{ marginBottom: '10px' }}>
                <button onClick={() => loadPlan(plan)}>{plan.name}</button>
                <DeletePlanButton onClick={() => deletePlan(index)}>Delete Plan</DeletePlanButton>
              </li>
            ))}
          </ul>
        </TradePlanWrapper>
      )}
    </Container>
  );
};

export default TradePlanComponent;
