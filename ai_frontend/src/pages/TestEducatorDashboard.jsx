import React from 'react';
import { Container, Card, Row, Col } from 'react-bootstrap';

const TestEducatorDashboard = () => {
  return (
    <Container fluid className="py-4">
      <Row className="mb-4">
        <Col>
          <h1>Test Educator Dashboard</h1>
          <p>This is a simplified test version to verify the dashboard loads.</p>
        </Col>
      </Row>

      <Row className="mb-4">
        <Col md={3}>
          <Card>
            <Card.Body>
              <h3>25</h3>
              <p>Total Students</p>
            </Card.Body>
          </Card>
        </Col>
        <Col md={3}>
          <Card>
            <Card.Body>
              <h3>150</h3>
              <p>Sessions</p>
            </Card.Body>
          </Card>
        </Col>
        <Col md={3}>
          <Card>
            <Card.Body>
              <h3>72%</h3>
              <p>Avg Accuracy</p>
            </Card.Body>
          </Card>
        </Col>
        <Col md={3}>
          <Card>
            <Card.Body>
              <h3>500</h3>
              <p>Questions</p>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      <Row>
        <Col>
          <Card>
            <Card.Header>
              <h5>Dashboard Status</h5>
            </Card.Header>
            <Card.Body>
              <p>✅ Dashboard component is loading correctly</p>
              <p>✅ Bootstrap components are working</p>
              <p>✅ Layout is rendering properly</p>
              <p>If you can see this, the basic dashboard structure is working.</p>
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </Container>
  );
};

export default TestEducatorDashboard;