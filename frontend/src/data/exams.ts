export const SAMPLE_EXAMS = {
  'physics-101': {
    id: 'physics-101',
    title: 'Physics Midterm Exam',
    description: 'Test your understanding of fundamental physics concepts',
    duration: 30, // minutes
    totalQuestions: 10,
    passingScore: 60,
    questions: [
      {
        id: 1,
        text: 'What is the SI unit of force?',
        type: 'multiple-choice',
        options: ['Watt', 'Newton', 'Joule', 'Pascal'],
        correct: 1,
        explanation: 'Newton (N) is the SI unit of force, named after Isaac Newton.'
      },
      {
        id: 2,
        text: 'What does E=mc² represent?',
        type: 'multiple-choice',
        options: [
          'Kinetic energy formula',
          'Mass-energy equivalence',
          'Potential energy',
          'Momentum'
        ],
        correct: 1,
        explanation: 'This is Einsteins mass-energy equivalence equation.'
      },
      {
        id: 3,
        text: 'What is the speed of light in vacuum?',
        type: 'multiple-choice',
        options: [
          '3 × 10⁸ m/s',
          '3 × 10⁶ m/s',
          '3 × 10¹⁰ m/s',
          '3 × 10⁵ m/s'
        ],
        correct: 0,
        explanation: 'The speed of light is approximately 3 × 10⁸ meters per second.'
      },
      {
        id: 4,
        text: 'Which of the following is a vector quantity?',
        type: 'multiple-choice',
        options: ['Speed', 'Distance', 'Velocity', 'Time'],
        correct: 2,
        explanation: 'Velocity is a vector quantity because it has both magnitude and direction.'
      },
      {
        id: 5,
        text: 'What is the formula for kinetic energy?',
        type: 'multiple-choice',
        options: ['KE = mgh', 'KE = ½mv²', 'KE = Fd', 'KE = ma'],
        correct: 1,
        explanation: 'Kinetic energy is KE = ½mv², where m is mass and v is velocity.'
      },
      {
        id: 6,
        text: 'Newton\'s first law states that:',
        type: 'multiple-choice',
        options: [
          'F = ma',
          'An object in motion stays in motion unless acted upon by a force',
          'Every action has an equal and opposite reaction',
          'Energy cannot be created or destroyed'
        ],
        correct: 1,
        explanation: 'This is the law of inertia.'
      },
      {
        id: 7,
        text: 'What is the unit of pressure?',
        type: 'multiple-choice',
        options: ['Newton', 'Pascal', 'Joule', 'Watt'],
        correct: 1,
        explanation: 'Pascal (Pa) is the SI unit of pressure.'
      },
      {
        id: 8,
        text: 'Which statement about friction is true?',
        type: 'multiple-choice',
        options: [
          'Friction always opposes motion',
          'Friction is independent of surface area',
          'Friction can only be harmful',
          'Friction increases with velocity'
        ],
        correct: 0,
        explanation: 'Friction always opposes the direction of motion.'
      },
      {
        id: 9,
        text: 'What is gravitational potential energy?',
        type: 'multiple-choice',
        options: [
          'PE = ½mv²',
          'PE = mgh',
          'PE = Fd',
          'PE = ma'
        ],
        correct: 1,
        explanation: 'Gravitational PE = mgh, where m is mass, g is gravity, and h is height.'
      },
      {
        id: 10,
        text: 'The acceleration due to gravity on Earth is approximately:',
        type: 'multiple-choice',
        options: ['5 m/s²', '9.8 m/s²', '15 m/s²', '20 m/s²'],
        correct: 1,
        explanation: 'Standard gravity is 9.8 m/s² (sometimes rounded to 10 m/s²).'
      }
    ]
  },
  'biology-101': {
    id: 'biology-101',
    title: 'Biology Fundamentals Quiz',
    description: 'Test your knowledge of basic biological concepts',
    duration: 20,
    totalQuestions: 8,
    passingScore: 70,
    questions: [
      {
        id: 1,
        text: 'What is the powerhouse of the cell?',
        type: 'multiple-choice',
        options: ['Nucleus', 'Mitochondria', 'Ribosome', 'Golgi apparatus'],
        correct: 1,
        explanation: 'Mitochondria produces energy (ATP) for the cell.'
      },
      {
        id: 2,
        text: 'DNA stands for:',
        type: 'multiple-choice',
        options: [
          'Deoxyribose Nucleic Acid',
          'Deoxyribonucleic Acid',
          'Ribonucleic Acid',
          'Deoxyribose Nuclear Antigen'
        ],
        correct: 1,
        explanation: 'DNA = Deoxyribonucleic Acid, the molecule of heredity.'
      },
      {
        id: 3,
        text: 'How many chromosomes do humans have?',
        type: 'multiple-choice',
        options: ['23', '46', '48', '52'],
        correct: 1,
        explanation: 'Humans have 46 chromosomes (23 pairs).'
      },
      {
        id: 4,
        text: 'Photosynthesis occurs in which organelle?',
        type: 'multiple-choice',
        options: ['Mitochondria', 'Chloroplast', 'Nucleus', 'Lysosome'],
        correct: 1,
        explanation: 'Photosynthesis happens in chloroplasts in plant cells.'
      },
      {
        id: 5,
        text: 'What is the basic unit of life?',
        type: 'multiple-choice',
        options: ['Atom', 'Molecule', 'Cell', 'Tissue'],
        correct: 2,
        explanation: 'The cell is the smallest unit of life.'
      },
      {
        id: 6,
        text: 'Which enzyme breaks down glucose?',
        type: 'multiple-choice',
        options: ['Lipase', 'Amylase', 'Proteases', 'Enzymes in glycolysis'],
        correct: 3,
        explanation: 'Glycolysis is the metabolic pathway that breaks down glucose.'
      },
      {
        id: 7,
        text: 'What is the primary function of ribosomes?',
        type: 'multiple-choice',
        options: [
          'DNA replication',
          'Protein synthesis',
          'Energy production',
          'Fat storage'
        ],
        correct: 1,
        explanation: 'Ribosomes synthesize proteins from mRNA instructions.'
      },
      {
        id: 8,
        text: 'Which blood type is the universal donor?',
        type: 'multiple-choice',
        options: ['A', 'B', 'AB', 'O'],
        correct: 3,
        explanation: 'O negative blood is the universal donor.'
      }
    ]
  }
}

export const EXAM_LIST = Object.values(SAMPLE_EXAMS)
