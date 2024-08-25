import express from "express";
import pkgPg from "pg";
import bodyParser from "body-parser";
import env from "dotenv";
import axios from "axios";

/*******************{ Initialize Important Variables }*************************/
const app = express();
const port = 3001;

env.config();

const { Pool } = pkgPg;
const pool = new Pool({
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  database: process.env.DB_DATABASE,
});

/*************************{ Initialize Middleware }****************************/
app.use(bodyParser.urlencoded({ extended: true }));

/***********************{ Initialize Route handlers }**************************/
app.get("/pokemon", async (req, res) => {
  const id = req.query.id;
  const name = req.query.name;
  try {
    const client = await pool.connect();
    try {
      if (id) {
        const result = await client.query(
          "SELECT * FROM pokemon WHERE pokedex_number = $1",
          [parseInt(id)]
        );
        client.release();
        // make sure at least Pokémon is registered
        if (result.rows.length) {
          res.json(result.rows[0]);
        } else {
          res.status(404).json({
            error: { status: 404, message: "No Pokémon with that id" },
          });
        }
      } else if (name) {
        const result = await client.query(
          "SELECT * FROM pokemon WHERE name = $1",
          [name.toLowerCase().trim()]
        );
        client.release();
        // make sure at least Pokémon is registered
        if (result.rows.length) {
          res.json(result.rows[0]);
        } else {
          res.status(404).json({
            error: { status: 404, message: "No Pokémon with that name" },
          });
        }
      } else {
        // fetch random Pokémon
        const result = await client.query(
          "SELECT * FROM pokemon ORDER BY RANDOM() LIMIT 1"
        );
        client.release();
        // make sure there is at least one registered Pokémon
        if (result.rows.length) {
          res.json(result.rows[Math.floor(Math.random() * result.rows.length)]);
        } else {
          res.status(404).json({
            error: { status: 404, message: "No registered Pokémon" },
          });
        }
      }
    } catch (err) {
      client.release();
      console.error("Error retrieving Pokémon from database in /pokemon route");
      res.status(500).json({
        error: {
          status: 500,
          message: "Error retrieving Pokémon from database in /pokemon route",
        },
      });
    }
  } catch (err) {
    console.error(
      "Error retrieving connected client from pool in /pokemon route"
    );
    res.status(500).json({
      error: {
        status: 500,
        message:
          "Error retrieving connected client from pool in /pokemon route",
      },
    });
  }
});

app.get("/legendary", async (req, res) => {
  try {
    const client = await pool.connect();
    try {
      const result = await client.query(
        "SELECT * FROM pokemon WHERE legendary = $1",
        [true]
      );
      client.release();
      // make sure at least one registered Pokémon exists
      if (result.rows.length) {
        res.json(result.rows);
      } else {
        res.status(404).json({
          error: { status: 404, message: "No registered Legendary Pokémon" },
        });
      }
    } catch {
      client.release();
      console.error("Error retrieving Legendary Pokémon from database");
      res.status(500).json({
        error: {
          status: 500,
          message: "Error retrieving Legendary Pokémon from database",
        },
      });
    }
  } catch (err) {
    console.error(
      "Error retrieving connected client from pool in /legendary route"
    );
    res.status(500).json({
      error: {
        status: 500,
        message:
          "Error retrieving connected client from pool in /legendary route",
      },
    });
  }
});

app.get("/mythical", async (req, res) => {
  try {
    const client = await pool.connect();
    try {
      const result = await client.query(
        "SELECT * FROM pokemon WHERE mythical = $1",
        [true]
      );
      client.release();
      // make sure at least one registered Pokémon exists
      if (result.rows.length) {
        res.json(result.rows);
      } else {
        res.status(404).json({
          error: { status: 404, message: "No registered Mythical Pokémon" },
        });
      }
    } catch {
      client.release();
      console.error("Error retrieving Mythical Pokémon from database");
      res.status(500).json({
        error: {
          status: 500,
          message: "Error retrieving Mythical Pokémon from database",
        },
      });
    }
  } catch (err) {
    console.error(
      "Error retrieving connected client from pool in /mythical route"
    );
    res.status(500).json({
      error: {
        status: 500,
        message:
          "Error retrieving connected client from pool in /mythical route",
      },
    });
  }
});

app.get("/ptype/:type", async (req, res) => {
  const ptype = req.params.type.toLowerCase().trim();
  try {
    const client = await pool.connect();
    try {
      const result = await client.query(
        "SELECT * FROM pokemon WHERE primary_type = $1",
        [ptype]
      );
      client.release();
      // make sure at least one registered Pokémon exists
      if (result.rows.length) {
        res.json(result.rows);
      } else {
        res.status(404).json({
          error: {
            status: 404,
            message: `No pokémon with primary type ${ptype}`,
          },
        });
      }
    } catch {
      client.release();
      console.error(
        `Error retrieving Primary Type ${ptype} Pokémon from database`
      );
      res.status(500).json({
        error: {
          status: 500,
          message: `Error retrieving Primary Type ${ptype} Pokémon from database`,
        },
      });
    }
  } catch (err) {
    console.error(
      "Error retrieving connected client from pool in /ptype route"
    );
    res.status(500).json({
      error: {
        status: 500,
        message: "Error retrieving connected client from pool in /ptype route",
      },
    });
  }
});

app.get("/stype/:type", async (req, res) => {
  const stype = req.params.type.toLowerCase().trim();
  try {
    const client = await pool.connect();
    try {
      const result = await client.query(
        "SELECT * FROM pokemon WHERE secondary_type = $1",
        [stype]
      );
      client.release();
      // make sure at least one registered Pokémon exists
      if (result.rows.length) {
        res.json(result.rows);
      } else {
        res.status(404).json({
          error: {
            status: 404,
            message: `No pokémon with secondary type ${stype}`,
          },
        });
      }
    } catch {
      client.release();
      console.error(
        `Error retrieving Secondary Type ${stype} Pokémon from database`
      );
      res.status(500).json({
        error: {
          status: 500,
          message: `Error retrieving Secondary Type ${stype} Pokémon from database`,
        },
      });
    }
  } catch (err) {
    console.error(
      "Error retrieving connected client from pool in /stype route"
    );
    res.status(500).json({
      error: {
        status: 500,
        message: "Error retrieving connected client from pool in /stype route",
      },
    });
  }
});

app.get("/type/:type", async (req, res) => {
  const type = req.params.type.toLowerCase().trim();
  try {
    const client = await pool.connect();
    try {
      const result = await client.query(
        "SELECT * FROM pokemon WHERE primary_type = $1 OR secondary_type = $1",
        [type]
      );
      client.release();
      if (result.rows.length) {
        res.json(result.rows);
      } else {
        res.status(404).json({
          error: {
            status: 404,
            message: `No pokémon with type ${type}`,
          },
        });
      }
    } catch {
      client.release();
      console.error(`Error retrieving ${type} Pokémon from database`);
      res.status(500).json({
        error: {
          status: 500,
          message: `Error retrieving ${type} Pokémon from database`,
        },
      });
    }
  } catch (err) {
    console.error("Error retrieving connected client from pool in /type route");
    res.status(500).json({
      error: {
        status: 500,
        message: "Error retrieving connected client from pool in /type route",
      },
    });
  }
});

app.post("/register/:id", async (req, res) => {
  // check if authenticated
  if (
    !req.headers["x-api-key"] ||
    process.env.API_KEY != req.headers["x-api-key"]
  ) {
    res.status(401).json({
      error: {
        status: 401,
        message: req.headers["x-api-key"]
          ? "Error due to icorrect API key in /register route"
          : "Error due to missing API key in /register route",
      },
    });
  } else {
    const id = req.params.id;
    try {
      // get Pokémon data from PokéAPI
      const firstResponse = await axios.get(
        `https://pokeapi.co/api/v2/pokemon/${parseInt(id)}/`
      );
      const secondResponse = await axios.get(
        `https://pokeapi.co/api/v2/pokemon-species/${parseInt(id)}/`
      );
      const firstData = firstResponse.data;
      const secondData = secondResponse.data;
      try {
        const client = await pool.connect();
        try {
          // make sure Pokémon to register is not already registered
          const result = await client.query(
            "SELECT * FROM pokemon WHERE pokedex_number = $1",
            [firstData.id]
          );
          if (result.rows.length) {
            client.release();
            res.status(409).json({
              error: {
                status: 409,
                message: "Pokémon is already registered",
              },
            });
          } else {
            try {
              await client.query(
                "INSERT INTO pokemon VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)",
                [
                  firstData.id,
                  firstData.name,
                  firstData.types[0].type.name,
                  firstData.types.length > 1
                    ? firstData.types[1].type.name
                    : null,
                  secondData.is_legendary,
                  secondData.is_mythical,
                  firstData.sprites.front_default,
                  firstData.sprites.front_shiny,
                  0,
                  0,
                ]
              );
              client.release();
              res.sendStatus(200);
            } catch (err) {
              client.release();
              console.error("Error registering Pokémon into database");
              res.status(500).json({
                error: {
                  status: 500,
                  message: "Error registering Pokémon into database",
                },
              });
            }
          }
        } catch (err) {
          client.release();
          console.error(
            "Error retrieving Pokémon from database in /register route"
          );
          res.status(500).json({
            error: {
              status: 500,
              message:
                "Error retrieving Pokémon from database in /register route",
            },
          });
        }
      } catch (err) {
        console.error(
          "Error retrieving connected client from pool in /register route"
        );
        res.status(500).json({
          error: {
            status: 500,
            message:
              "Error retrieving connected client from pool in /register route",
          },
        });
      }
    } catch (err) {
      console.error("Error retrieving data from PokeAPI");
      res.status(500).json({
        error: {
          status: 500,
          message: "Error retrieving data from PokeAPI",
        },
      });
    }
  }
});

app.delete("/delete/:id", async (req, res) => {
  // check if authenticated
  if (
    !req.headers["x-api-key"] ||
    process.env.API_KEY != req.headers["x-api-key"]
  ) {
    res.status(401).json({
      error: {
        status: 401,
        message: req.headers["x-api-key"]
          ? "Error due to icorrect API key in /delete route"
          : "Error due to missing API key in /delete route",
      },
    });
  } else {
    const id = req.params.id;
    try {
      const client = await pool.connect();
      try {
        // make sure Pokémon to delete is registered
        const result = await client.query(
          "SELECT * FROM pokemon WHERE pokedex_number = $1",
          [id]
        );
        if (result.rows.length) {
          try {
            await client.query(
              "DELETE FROM pokemon WHERE pokedex_number = $1",
              [id]
            );
            client.release();
            res.sendStatus(200);
          } catch (err) {
            client.release();
            console.error("Error deleting Pokémon from database");
            res.status(500).json({
              error: {
                status: 500,
                message: "Error deleting Pokémon from database",
              },
            });
          }
        } else {
          client.release();
          res.status(404).json({
            error: {
              status: 404,
              message: "Pokémon to delete is not registered",
            },
          });
        }
      } catch (err) {
        client.release();
        console.error(
          "Error retrieving Pokémon from database in /delete route"
        );
        res.status(500).json({
          error: {
            status: 500,
            message: "Error retrieving Pokémon from database in /delete route",
          },
        });
      }
    } catch (err) {
      console.error(
        "Error retrieving connected client from pool in /delete route"
      );
      res.status(500).json({
        error: {
          status: 500,
          message:
            "Error retrieving connected client from pool in /delete route",
        },
      });
    }
  }
});

app.patch("/update/:id", async (req, res) => {
  // check if authenticated
  if (
    !req.headers["x-api-key"] ||
    process.env.API_KEY != req.headers["x-api-key"]
  ) {
    res.status(401).json({
      error: {
        status: 401,
        message: req.headers["x-api-key"]
          ? "Error due to icorrect API key in /update route"
          : "Error due to missing API key in /update route",
      },
    });
  } else {
    try {
      const client = await pool.connect();
      const id = req.params.id;
      const quantity = req.body.quantity;
      const shinyQuantity = req.body.shinyQuantity;
      // make sure user specified which field to update
      if (quantity || shinyQuantity) {
        try {
          // make sure Pokémon to update is registered
          const result = await client.query(
            "SELECT * FROM pokemon WHERE pokedex_number = $1",
            [id]
          );
          if (result.rows.length) {
            try {
              if (quantity) {
                await client.query(
                  "UPDATE pokemon SET quantity = $1 WHERE pokedex_number = $2",
                  [quantity, id]
                );
              } else {
                await client.query(
                  "UPDATE pokemon SET quantity_shiny = $1 WHERE pokedex_number = $2",
                  [shinyQuantity, id]
                );
              }
              client.release();
              res.sendStatus(200);
            } catch {
              client.release();
              console.error("Error updating Pokémon in database");
              res.status(500).json({
                error: {
                  status: 500,
                  message: "Error updating Pokémon in database",
                },
              });
            }
          } else {
            client.release();
            res.status(404).json({
              error: {
                status: 404,
                message: "Pokémon to update is not registered",
              },
            });
          }
        } catch {
          client.release();
          console.error(
            "Error retrieving Pokémon from database in /update route"
          );
          res.status(500).json({
            error: {
              status: 500,
              message:
                "Error retrieving Pokémon from database in /update route",
            },
          });
        }
      } else {
        client.release();
        res.status(400).json({
          error: {
            status: 400,
            message: "Did not properly specify which quantity to update",
          },
        });
      }
    } catch (err) {
      console.error(
        "Error retrieving connected client from pool in /update route"
      );
      res.status(500).json({
        error: {
          status: 500,
          message:
            "Error retrieving connected client from pool in /update route",
        },
      });
    }
  }
});

/*********************************{ Start Server}******************************/
app.listen(port, () => {
  console.log(`Listening in on port ${port}`);
});
